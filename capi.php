<?php
/* ═══════════════════════════════════════════════════════════════════════════
   Meta Conversions API (CAPI) — endpoint do próprio domínio

   Recebe os eventos do `tracking.js` e os reenvia ao Meta pelo servidor. Isso
   recupera as conversões que o pixel do navegador perde (bloqueadores, ITP do
   Safari, aba fechada no meio do redirect) e melhora a atribuição, porque o
   servidor agrega IP e User-Agent reais.

   Deduplicação: o navegador e este arquivo mandam o MESMO `event_id`. O Meta
   junta os dois em uma conversão só. Se o id divergir, conta em dobro.

   PII (e-mail, telefone, nome) chega em claro por HTTPS do mesmo domínio e sai
   daqui em SHA-256, como a Meta exige. Nada é gravado em disco.

   Os tokens ficam em `capi-config.php`, nunca no JavaScript.
   ═══════════════════════════════════════════════════════════════════════════ */

declare(strict_types=1);

const CAPI_GRAPH_VERSION = 'v23.0';

/* Nenhuma resposta útil para o navegador: o evento é fire-and-forget. */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function capi_end(int $status, string $message = ''): void
{
    http_response_code($status);
    echo json_encode(['ok' => $status < 400, 'message' => $message]);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    capi_end(405, 'method not allowed');
}

/* O config carrega o access token, então o melhor lugar para ele é FORA da
   raiz web — onde nenhuma requisição alcança, com ou sem .htaccess. Procura de
   cima para baixo e usa o primeiro que existir:

     /home/USUARIO/capi-config.php   ← fora da raiz (recomendado)
     .../public_html/capi-config.php
     ./capi-config.php               ← ao lado deste arquivo (padrão)

   Assim basta MOVER o arquivo para cima: nada aqui precisa ser editado. */
$config = null;
foreach ([dirname(__DIR__, 2), dirname(__DIR__), __DIR__] as $dir) {
    $tentativa = $dir . '/capi-config.php';
    if (is_file($tentativa)) { $config = require $tentativa; break; }
}
if (!is_array($config)) {
    capi_end(500, 'config ausente');
}

/* Só aceita chamada vinda das próprias páginas. Não é blindagem criptográfica,
   mas evita que o endpoint seja usado de fora para poluir o pixel. */
$origin = $_SERVER['HTTP_ORIGIN'] ?? $_SERVER['HTTP_REFERER'] ?? '';
$host    = $_SERVER['HTTP_HOST'] ?? '';
if ($origin !== '') {
    $originHost = parse_url($origin, PHP_URL_HOST) ?: '';
    if ($originHost !== '' && strcasecmp($originHost, $host) !== 0) {
        capi_end(403, 'origin not allowed');
    }
}

$raw = file_get_contents('php://input') ?: '';
if ($raw === '' || strlen($raw) > 20000) {
    capi_end(400, 'empty or oversized body');
}

$body = json_decode($raw, true);
if (!is_array($body)) {
    capi_end(400, 'invalid json');
}

$pixelId = (string) ($body['pixel_id'] ?? '');
if (!isset($config['pixels'][$pixelId])) {
    capi_end(400, 'unknown pixel');
}
$accessToken = (string) $config['pixels'][$pixelId];
if ($accessToken === '') {
    capi_end(500, 'missing access token');
}

$allowedEvents = $config['events'] ?? ['PageView', 'Lead', 'ViewContent', 'Contact'];
$eventName = (string) ($body['event_name'] ?? '');
if (!in_array($eventName, $allowedEvents, true)) {
    capi_end(400, 'event not allowed');
}

/* ── normalização exigida pela Meta: minúsculas, sem espaços, depois SHA-256 ── */
function capi_lower(string $value): string
{
    return function_exists('mb_strtolower')
        ? mb_strtolower($value, 'UTF-8')
        : strtolower($value);
}

function capi_hash(?string $value): ?string
{
    $value = trim((string) $value);
    if ($value === '') {
        return null;
    }
    return hash('sha256', capi_lower($value));
}

/* Cidade e estado: a Meta compara sem espaço, pontuação nem acento. Sem esta
   limpeza, "Capivari de Baixo" nunca casaria com o cadastro dela lá. */
function capi_hash_place(?string $value): ?string
{
    $value = trim((string) $value);
    if ($value === '') {
        return null;
    }
    $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT', $value);
    if ($ascii !== false) {
        $value = $ascii;
    }
    $value = preg_replace('/[^a-zA-Z]/', '', capi_lower($value)) ?? '';
    return $value === '' ? null : hash('sha256', $value);
}

/* Telefone: só dígitos, com DDI. Número brasileiro sem o 55 na frente não bate
   com nada do lado da Meta, então ele é acrescentado aqui. */
function capi_hash_phone(?string $value): ?string
{
    $digits = preg_replace('/\D+/', '', (string) $value) ?? '';
    if ($digits === '') {
        return null;
    }
    if (strlen($digits) <= 11 && strncmp($digits, '55', 2) !== 0) {
        $digits = '55' . $digits;
    }
    return hash('sha256', $digits);
}

/* IP real por trás de Cloudflare / proxy do compartilhado. */
function capi_client_ip(): string
{
    foreach (['HTTP_CF_CONNECTING_IP', 'HTTP_X_REAL_IP', 'HTTP_X_FORWARDED_FOR'] as $header) {
        $value = $_SERVER[$header] ?? '';
        if ($value === '') {
            continue;
        }
        $ip = trim(explode(',', $value)[0]);
        if (filter_var($ip, FILTER_VALIDATE_IP)) {
            return $ip;
        }
    }
    return (string) ($_SERVER['REMOTE_ADDR'] ?? '');
}

$in = is_array($body['user_data'] ?? null) ? $body['user_data'] : [];

/* Plano B: o navegador guarda a identidade em localStorage e espelha no cookie
   `_ln_id`. Se o POST chegar sem user_data — beacon truncado, JS que morreu no
   meio, aba fechada no redirect — o cookie ainda diz quem é a pessoa. O corpo
   tem prioridade: é o dado mais fresco, recém-saído do formulário. */
$cookieId = [];
if (!empty($_COOKIE['_ln_id'])) {
    /* Nome próprio: `$raw` acima é o corpo da requisição, e sombrear isso aqui
       seria pedir para alguém quebrar o parser numa edição futura. */
    $rawCookie = (string) $_COOKIE['_ln_id'];
    $decoded = json_decode($rawCookie, true);
    if (!is_array($decoded)) {
        $decoded = json_decode(urldecode($rawCookie), true);
    }
    if (is_array($decoded)) {
        $cookieId = $decoded;
    }
}
/* Só escalar entra: o cookie é dado do cliente, e um array aqui viraria
   "Array to string conversion" lá no hash. */
foreach (['em', 'ph', 'nome', 'ct', 'st'] as $field) {
    if (empty($in[$field]) && !empty($cookieId[$field]) && is_scalar($cookieId[$field])) {
        $in[$field] = $cookieId[$field];
    }
}
if (empty($in['external_id']) && !empty($cookieId['uid']) && is_scalar($cookieId['uid'])) {
    $in['external_id'] = $cookieId['uid'];
}

/* O corpo do POST também é dado do cliente: mesma regra. */
foreach (['em', 'ph', 'nome', 'ct', 'st', 'external_id'] as $field) {
    if (isset($in[$field]) && !is_scalar($in[$field])) {
        unset($in[$field]);
    }
}

$userData = [];
if ($hash = capi_hash($in['em'] ?? null))       { $userData['em'] = [$hash]; }
if ($hash = capi_hash_phone($in['ph'] ?? null)) { $userData['ph'] = [$hash]; }

/* Nome completo em um campo só → primeiro nome (fn) e sobrenome (ln). */
$nome = trim((string) ($in['nome'] ?? ''));
if ($nome !== '') {
    $parts = preg_split('/\s+/', $nome) ?: [];
    if ($hash = capi_hash($parts[0] ?? null)) {
        $userData['fn'] = [$hash];
    }
    if (count($parts) > 1 && ($hash = capi_hash(end($parts)))) {
        $userData['ln'] = [$hash];
    }
}
if ($hash = capi_hash_place($in['ct'] ?? null)) { $userData['ct'] = [$hash]; }
if ($hash = capi_hash_place($in['st'] ?? null)) { $userData['st'] = [$hash]; }

/* external_id: o identificador estável que o navegador criou na primeira visita
   e, quando já se conhece, o e-mail. A Meta aceita mais de um valor, e cada um
   é uma chance a mais de casar a pessoa — o uid liga as visitas anônimas de
   antes do formulário, o e-mail liga os aparelhos dela. */
$externalIds = [];
if ($hash = capi_hash($in['external_id'] ?? null)) {
    $externalIds[] = $hash;
}
if (isset($userData['em'])) {
    $externalIds[] = $userData['em'][0];
}
if ($externalIds !== []) {
    $userData['external_id'] = array_values(array_unique($externalIds));
}

/* Público inteiramente brasileiro (páginas em pt-BR, WhatsApp +55). É um sinal
   de correspondência de graça; se um dia houver público de fora, sai daqui. */
$userData['country'] = [hash('sha256', 'br')];

$fbp = (string) ($body['fbp'] ?? '');
$fbc = (string) ($body['fbc'] ?? '');
if ($fbp !== '') { $userData['fbp'] = $fbp; }
if ($fbc !== '') { $userData['fbc'] = $fbc; }

$userData['client_ip_address'] = capi_client_ip();
$userData['client_user_agent'] = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');

$eventSourceUrl = (string) ($body['event_source_url'] ?? '');
if (!filter_var($eventSourceUrl, FILTER_VALIDATE_URL)) {
    $eventSourceUrl = 'https://' . $host . ($_SERVER['REQUEST_URI'] ?? '');
}

$customData = is_array($body['custom_data'] ?? null) ? $body['custom_data'] : [];

$event = [
    'event_name'       => $eventName,
    'event_time'       => time(),
    'event_id'         => (string) ($body['event_id'] ?? ''),
    'event_source_url' => $eventSourceUrl,
    'action_source'    => 'website',
    'user_data'        => $userData,
];
if ($customData !== []) {
    $event['custom_data'] = $customData;
}

$payload = ['data' => [$event]];

/* Codigo de teste: cada pixel tem o seu na aba "Testar eventos". Aceita string
   (mesmo codigo para todos) ou array pixel_id => codigo, para testar os dois
   pixels de uma vez. Vazio em producao. */
$testCode = $config['test_event_code'] ?? '';
if (is_array($testCode)) {
    $testCode = (string) ($testCode[$pixelId] ?? '');
}

/* A página também pode pedir um código pela URL (`?capi_test=...`), para testar
   em produção sem marcar as visitas reais. Só vale o que estiver na lista
   `url_test_codes`: sem essa trava, qualquer um desviaria eventos alheios para
   uma aba de teste própria. */
$urlTestCode = (string) ($body['test_event_code'] ?? '');
if ($urlTestCode !== '' && in_array($urlTestCode, $config['url_test_codes'] ?? [], true)) {
    $testCode = $urlTestCode;
}

if ($testCode !== '') {
    $payload['test_event_code'] = $testCode;
}

$url = 'https://graph.facebook.com/' . CAPI_GRAPH_VERSION . '/' . $pixelId
     . '/events?access_token=' . urlencode($accessToken);

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT        => 5,
    CURLOPT_CONNECTTIMEOUT => 3,
]);
$response = curl_exec($ch);
$httpCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

/* Erro só vai para o log do servidor — a página nunca deve quebrar por causa
   de rastreio, e o token não pode aparecer em resposta nenhuma. */
if ($httpCode !== 200) {
    error_log('[CAPI] pixel ' . $pixelId . ' evento ' . $eventName
        . ' HTTP ' . $httpCode . ' ' . $curlErr . ' ' . substr((string) $response, 0, 500));
    capi_end(202, 'queued with errors');
}

capi_end(200, 'sent');
