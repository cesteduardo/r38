/* ═══════════════════════════════════════════════════════════════════════════
   Rastreio unificado — Meta Pixel (navegador) + CAPI (servidor)

   Este é o ÚNICO script de rastreio da página. Não há GTM, GA4, PixelYourSite
   nem qualquer outro plugin: tudo que o Meta recebe sai daqui.

   Como usar (no <head>, antes deste arquivo):

     <script>window.LN_TRACK={pixel:'0000000000'};</script>
     <script src="tracking.js"></script>

   Opções do LN_TRACK:
     pixel   → pixel que recebe o PageView automático desta página
     pixels  → todos os pixels a inicializar (padrão: [pixel])
     capi    → caminho do endpoint servidor (padrão: 'capi.php')

   API exposta:
     LNTrack.lead({pixel, custom, user})  → dispara Lead no pixel indicado
     LNTrack.track(nome, {...})           → qualquer outro evento padrão
     LNTrack.userFrom(campos)             → monta o user_data a partir do form
     LNTrack.remember(campos)             → guarda a identidade sem disparar
     LNTrack.identity()                   → o que está guardado hoje
     LNTrack.forget()                     → apaga tudo (opt-out)

   Deduplicação: cada evento nasce com um event_id único, usado ao mesmo tempo
   no navegador (eventID do fbq) e no servidor (CAPI). Sem isso o Meta contaria
   a mesma conversão duas vezes em vez de uni-las.

   Identidade persistente: quem preenche um formulário passa a ser reconhecido
   em TODO evento seguinte — inclusive o PageView de outra página do domínio —
   porque nome, e-mail, telefone e cidade ficam guardados no navegador dela e
   entram tanto na correspondência avançada do pixel quanto no user_data da
   CAPI. É isso que levanta a nota de qualidade da correspondência de eventos:
   um Lead com só IP e user-agent é quase um evento anônimo para o Meta.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (w, d) {
  'use strict';

  var CFG = w.LN_TRACK || {};
  var PAGEVIEW_PIXEL = CFG.pixel || '';
  var PIXELS = CFG.pixels || (PAGEVIEW_PIXEL ? [PAGEVIEW_PIXEL] : []);
  var CAPI_URL = CFG.capi === undefined ? 'capi.php' : CFG.capi;

  /* Guardados por 180 dias, o limite que a Meta usa para janela de atribuição.
     Chave no localStorage + cópia em cookie: o cookie é o plano B para quando o
     localStorage está bloqueado (Safari privado, iframe) e, de quebra, deixa o
     capi.php remontar a identidade mesmo se o corpo do POST chegar vazio.
     path=/ de propósito: as quatro páginas moram no mesmo domínio, então quem
     se identifica na home já é conhecido na imersão. */
  var STORE_KEY = 'ln_identity';
  var STORE_COOKIE = '_ln_id';
  var STORE_DAYS = 180;

  /* ── Meta Pixel: código base oficial ── */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v;
    s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(w, d, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  /* ── utilidades ── */
  function cookie(name) {
    var m = d.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return m ? m.pop() : '';
  }

  function setCookie(name, value, days) {
    var exp = new Date(Date.now() + days * 864e5).toUTCString();
    var secure = w.location.protocol === 'https:' ? ';Secure' : '';
    d.cookie = name + '=' + value + ';expires=' + exp + ';path=/;SameSite=Lax' + secure;
  }

  function newEventId(prefix) {
    return (prefix || 'ev') + '-' + Date.now().toString(36) + '-' +
           Math.random().toString(36).slice(2, 10);
  }

  function session() {
    try { return JSON.parse(sessionStorage.getItem('leticiaTracking') || '{}'); }
    catch (e) { return {}; }
  }

  /* Código de teste da Meta pedido pela URL: `?capi_test=TEST12345`. Fica na
     sessão da aba para sobreviver ao pulo de index → obrigado, senão o Lead do
     obrigado.html cairia fora da aba de teste. O servidor só aceita códigos que
     estejam na lista `url_test_codes` do capi-config.php. */
  function testCode() {
    var fromUrl = new URLSearchParams(w.location.search).get('capi_test') || '';
    if (fromUrl) {
      try { sessionStorage.setItem('leticiaCapiTest', fromUrl); } catch (e) {}
      return fromUrl;
    }
    try { return sessionStorage.getItem('leticiaCapiTest') || ''; }
    catch (e) { return ''; }
  }

  /* _fbc real quando existe; senão monta a partir do fbclid da URL ou da sessão
     — mesmo formato que o pixel usaria, para o clique não se perder. */
  function fbc() {
    var c = cookie('_fbc');
    if (c) return c;
    var id = new URLSearchParams(w.location.search).get('fbclid') || session().fbclid;
    return id ? 'fb.1.' + Date.now() + '.' + id : '';
  }

  /* ═══ normalização ═══
     As mesmas regras do capi.php. Precisa bater: o navegador manda o valor para
     o fbq hashear e o servidor hasheia por conta própria. Se um normalizar
     diferente do outro, saem dois hashes distintos da mesma pessoa e o Meta
     trata como duas pessoas. */
  function lower(v) { return String(v == null ? '' : v).trim().toLowerCase(); }

  function normPhone(v) {
    var digits = String(v == null ? '' : v).replace(/\D+/g, '');
    if (!digits) return '';
    /* Número brasileiro sem o 55 na frente não casa com nada do lado do Meta. */
    if (digits.length <= 11 && digits.slice(0, 2) !== '55') digits = '55' + digits;
    return digits;
  }

  /* Cidade e estado: o Meta compara sem espaço, pontuação nem acento. Sem esta
     limpeza, "Capivari de Baixo" nunca casaria com o cadastro dela lá. */
  function normPlace(v) {
    var s = lower(v);
    /* NFD separa "ao" acentuado em letra + acento combinante, e o filtro de a-z
       abaixo leva o acento embora junto com espaco e pontuacao. Nao ha por que
       cacar o acento numa regex propria. */
    try { s = s.normalize('NFD'); } catch (e) {}
    return s.replace(/[^a-z]/g, '');
  }

  /* ═══ identidade guardada no navegador ═══ */

  function readStore() {
    var raw = '';
    try { raw = localStorage.getItem(STORE_KEY) || ''; } catch (e) {}
    if (!raw) {
      var c = cookie(STORE_COOKIE);
      if (c) { try { raw = decodeURIComponent(c); } catch (e) {} }
    }
    if (!raw) return {};
    try { return JSON.parse(raw) || {}; } catch (e) { return {}; }
  }

  function writeStore(data) {
    var raw = JSON.stringify(data);
    try { localStorage.setItem(STORE_KEY, raw); } catch (e) {}
    setCookie(STORE_COOKIE, encodeURIComponent(raw), STORE_DAYS);
  }

  var identity = readStore();

  /* external_id estável, criado na primeira visita e mantido para sempre. Liga
     as visitas da mesma pessoa antes mesmo de ela dizer quem é — o e-mail só
     aparece no envio do formulário, e tudo que veio antes ficaria solto. */
  if (!identity.uid) {
    identity.uid = 'ln-' + Date.now().toString(36) + '-' +
                   Math.random().toString(36).slice(2, 12);
    writeStore(identity);
  }

  /* Guarda o que o formulário revelou. Campo vazio não apaga o que já existe:
     um formulário curto depois de um longo não pode fazer a pessoa regredir
     para anônima. */
  function remember(fields) {
    fields = fields || {};
    var next = {};
    var changed = false;

    if (fields.em)   { next.em = lower(fields.em); }
    if (fields.ph)   { next.ph = normPhone(fields.ph); }
    if (fields.nome) { next.nome = String(fields.nome).trim(); }
    if (fields.ct)   { next.ct = normPlace(fields.ct); }
    if (fields.st)   { next.st = normPlace(fields.st); }

    for (var k in next) {
      if (next[k] && identity[k] !== next[k]) { identity[k] = next[k]; changed = true; }
    }
    if (changed) { writeStore(identity); applyAdvancedMatching(); }
    return identity;
  }

  /* O user_data que vai para a CAPI. Não recebe nada por parâmetro de propósito:
     o que o formulário informou já entrou na identidade pelo remember(), então
     existe uma fonte só da verdade e ela já está normalizada. */
  function userData() {
    var out = {};
    ['em', 'ph', 'nome', 'ct', 'st'].forEach(function (k) {
      if (identity[k]) out[k] = identity[k];
    });
    if (identity.uid) out.external_id = identity.uid;
    return out;
  }

  /* ═══ correspondência avançada do pixel (lado navegador) ═══
     `fbq('init', id, {...})` é o único jeito de o evento do navegador levar
     e-mail e telefone. Sem isso ele chega só com IP e user-agent, que é o que
     estava acontecendo. Chamar init de novo com dados novos atualiza a
     correspondência dos eventos seguintes — o fbq faz o SHA-256 sozinho. */
  function advancedMatching() {
    var am = {};
    if (identity.em) am.em = identity.em;
    if (identity.ph) am.ph = identity.ph;
    if (identity.ct) am.ct = identity.ct;
    if (identity.st) am.st = identity.st;
    if (identity.uid) am.external_id = identity.uid;
    if (identity.nome) {
      var parts = identity.nome.split(/\s+/);
      am.fn = lower(parts[0]);
      if (parts.length > 1) am.ln = lower(parts[parts.length - 1]);
    }
    /* Todo o público é brasileiro; é um sinal de graça para a correspondência. */
    am.country = 'br';
    return am;
  }

  function applyAdvancedMatching() {
    var am = advancedMatching();
    PIXELS.forEach(function (id) {
      try { w.fbq('init', id, am); } catch (e) {}
    });
  }

  applyAdvancedMatching();

  /* ── envio para a CAPI (mesmo domínio → nenhum dado sai para terceiros) ──
     sendBeacon sobrevive ao redirect/navegação que vem logo depois do Lead. */
  function toServer(body) {
    if (!CAPI_URL) return;
    var json = JSON.stringify(body);
    try {
      if (w.navigator && navigator.sendBeacon) {
        var ok = navigator.sendBeacon(CAPI_URL, new Blob([json], { type: 'application/json' }));
        if (ok) return;
      }
    } catch (e) {}
    try {
      fetch(CAPI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: json,
        keepalive: true
      });
    } catch (e) {}
  }

  /* ── evento: navegador + servidor, com o mesmo event_id ── */
  function track(name, opts) {
    opts = opts || {};
    var pixel = opts.pixel || PAGEVIEW_PIXEL;
    if (!pixel) return '';
    var eventId = opts.eventId || newEventId(name.toLowerCase());
    var custom = opts.custom || {};

    /* O que o formulário informou passa a valer para todos os eventos futuros,
       inclusive o PageView da próxima página. */
    if (opts.user) { remember(opts.user); }

    try { w.fbq('trackSingle', pixel, name, custom, { eventID: eventId }); } catch (e) {}

    var body = {
      pixel_id: pixel,
      event_name: name,
      event_id: eventId,
      event_source_url: w.location.href,
      user_data: userData(),
      custom_data: custom,
      fbp: cookie('_fbp'),
      fbc: fbc()
    };
    var test = testCode();
    if (test) { body.test_event_code = test; }
    toServer(body);

    return eventId;
  }

  /* Monta o user_data da CAPI. Os dados vão em claro para o PHP do próprio
     domínio, que faz o SHA-256 antes de mandar ao Meta — nada de PII crua sai
     do servidor. */
  function userFrom(f) {
    f = f || {};
    var u = {};
    if (f.email) u.em = f.email;
    /* `whatsapp` é o nome do campo em boa parte das LPs; `telefone` e
       `phone` seguem aceitos para o arquivo servir qualquer página. */
    if (f.whatsapp || f.telefone || f.phone) u.ph = f.whatsapp || f.telefone || f.phone;
    if (f.nome || f.name) u.nome = f.nome || f.name;
    if (f.cidade) u.ct = f.cidade;
    if (f.estado) u.st = f.estado;
    return u;
  }

  w.LNTrack = {
    track: track,
    lead: function (opts) { return track('Lead', opts); },
    userFrom: userFrom,
    remember: function (f) { return remember(userFrom(f)); },
    identity: function () { var c = {}; for (var k in identity) c[k] = identity[k]; return c; },
    forget: function () {
      identity = {};
      try { localStorage.removeItem(STORE_KEY); } catch (e) {}
      setCookie(STORE_COOKIE, '', -1);
    },
    newEventId: newEventId,
    getFbp: function () { return cookie('_fbp'); },
    getFbc: fbc,
    pixels: PIXELS
  };

  /* PageView da página, no pixel dono dela — já com a identidade guardada, se
     a pessoa se identificou em qualquer visita anterior. */
  if (PAGEVIEW_PIXEL) track('PageView');
})(window, document);
