<?php
/* ═══════════════════════════════════════════════════════════════════════════
   Tokens da Conversions API. NUNCA vão para o JavaScript.

   Um token dá acesso de escrita ao pixel: quem o tiver pode injetar conversões
   falsas. Por isso ele vive só aqui, no servidor, e este arquivo não é servido
   pela web (o .htaccess da pasta bloqueia `capi-config.php`).
   ═══════════════════════════════════════════════════════════════════════════ */

return [
    /* pixel_id => access_token
       R38tao: preencher quando o pixel for criado, e o mesmo ID no index.html */
    'pixels' => [
        // 'PIXEL_ID' => 'ACCESS_TOKEN',
    ],

    /* Eventos que o endpoint aceita. Qualquer outro nome é recusado. */
    'events' => ['PageView', 'Lead', 'ViewContent', 'InitiateCheckout'],

    /* Só durante o teste no Gerenciador de Eventos. APAGUE depois. */
    'test_event_code' => '',

    /* Códigos aceitos via `?capi_test=CODIGO`. Esvazie ao terminar o teste. */
    'url_test_codes' => [],
];
