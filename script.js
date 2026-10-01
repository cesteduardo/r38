/* ============================================================
   R38TAO · Página de links
   1) Animação de entrada
   2) Copiar (npub e cupom) sem abrir o link do cartão
   3) Cotação BTC/BRL ao vivo
   4) Modais: Política de Privacidade / Termos de Uso
   5) Ano do rodapé
   6) Rastreio dos cliques (Meta Pixel + CAPI, via tracking.js)
   ============================================================ */
(() => {
  'use strict';

  /* 1) Animação de entrada: numera as peças (.a) de cada cena e marca a
     cena como .visto quando ela aparece. O CSS faz a cascata. */
  const cenas = [...document.querySelectorAll('.cena')];
  cenas.forEach((c) => c.querySelectorAll('.a').forEach((el, i) => el.style.setProperty('--i', i)));
  const ve = (c) => c.classList.add('visto');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { ve(e.target); io.unobserve(e.target); }
    }), { threshold: 0.05 });
    cenas.forEach((c) => io.observe(c));
  } else {
    cenas.forEach(ve);
  }

  /* 2) Copiar */
  const toast = document.getElementById('toast');
  let toastTimer;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  };

  const copy = async (el) => {
    const value = el.dataset.copy;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    showToast(value.length > 20 ? 'Chave Nostr copiada' : `Cupom ${value} copiado`);
  };

  document.querySelectorAll('[data-copy]').forEach((el) => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      copy(el);
    });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        copy(el);
      }
    });
  });

  /* 3) Cotação BTC/BRL */
  const status = document.querySelector('.status');
  const priceEls = document.querySelectorAll('[data-btc-price]');
  const changeEls = document.querySelectorAll('[data-btc-change]');
  const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  let last = null;

  const load = async () => {
    try {
      const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=brl&include_24hr_change=true', { cache: 'no-store' });
      if (!res.ok) throw new Error(res.status);
      const { bitcoin } = await res.json();
      const price = bitcoin.brl;
      const change = bitcoin.brl_24h_change;
      const flash = last !== null && price !== last ? (price > last ? 'sobe' : 'desce') : '';

      priceEls.forEach((el) => {
        el.textContent = brl.format(price);
        if (flash) { el.classList.add(flash); setTimeout(() => el.classList.remove(flash), 900); }
      });
      last = price;

      if (typeof change === 'number') {
        changeEls.forEach((el) => {
          el.textContent = `${change >= 0 ? '▲' : '▼'} ${Math.abs(change).toFixed(2)}%`;
          el.className = change >= 0 ? 'sobe' : 'desce';
        });
      }
      status.classList.remove('erro');
    } catch {
      if (last === null) {
        priceEls.forEach((el) => { el.textContent = 'indisponível'; });
        status.classList.add('erro');
      }
    }
  };

  load();
  setInterval(() => { if (!document.hidden) load(); }, 60000);

  /* 4) Modais. Fecham no ✕, no fundo e com Esc; o foco fica preso na caixa. */
  const FOCAVEIS = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let aberto = null;
  let voltarPara = null;

  const focaveis = (modal) =>
    [...modal.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null);

  const abrir = (id) => {
    const modal = document.getElementById(id);
    if (!modal || aberto) return;
    voltarPara = document.activeElement;
    modal.hidden = false;
    modal.classList.add('aberto');
    document.body.classList.add('travado');
    aberto = modal;
    const corpo = modal.querySelector('.modal__corpo');
    corpo.scrollTop = 0;
    corpo.focus();
  };

  const fechar = () => {
    if (!aberto) return;
    aberto.classList.remove('aberto');
    aberto.hidden = true;
    document.body.classList.remove('travado');
    aberto = null;
    if (voltarPara) voltarPara.focus();
    voltarPara = null;
  };

  document.querySelectorAll('[data-modal]').forEach((b) =>
    b.addEventListener('click', () => abrir(b.dataset.modal)));
  document.querySelectorAll('[data-fechar]').forEach((b) =>
    b.addEventListener('click', fechar));

  document.addEventListener('keydown', (ev) => {
    if (!aberto) return;
    if (ev.key === 'Escape') { ev.preventDefault(); fechar(); return; }
    if (ev.key !== 'Tab') return;
    const lista = focaveis(aberto);
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    const atual = document.activeElement;
    if (!aberto.contains(atual)) { ev.preventDefault(); primeiro.focus(); }
    else if (ev.shiftKey && atual === primeiro) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && atual === ultimo) { ev.preventDefault(); primeiro.focus(); }
  });

  /* 5) Ano do rodapé */
  document.getElementById('ano').textContent = new Date().getFullYear();

  /* 6) Rastreio dos cliques
     O PageView sai do tracking.js no carregamento. Aqui vai o que a pessoa
     escolheu. Lead só onde há intenção comercial direta (e-book, treinamento,
     ingresso); o resto é ViewContent, para não inflar o custo por lead.
     Para rastrear um link novo: data-cta="chave" no HTML + a chave aqui. */
  const CTA = {
    ebook:       { evento: 'Lead',        nome: 'E-book grátis',              cat: 'ebook' },
    treinamento: { evento: 'Lead',        nome: 'Treinamento do Zero',        cat: 'treinamento' },
    missao:      { evento: 'Lead',        nome: 'Missão Bitcoin Ciudad del Este', cat: 'evento' },
    agenda:      { evento: 'ViewContent', nome: 'Agenda de eventos 2026',     cat: 'evento' },
    livro:       { evento: 'ViewContent', nome: 'Livro Bitcoin Red Pill',     cat: 'livro' },
    audiobook:   { evento: 'ViewContent', nome: 'Audiobook Bitcoin Red Pill', cat: 'livro' },
    lexbitcoin:  { evento: 'ViewContent', nome: 'Lex Bitcoin',                cat: 'parceiro' },
    whatsapp:    { evento: 'ViewContent', nome: 'Canal no WhatsApp',          cat: 'comunidade' },
    telegram:    { evento: 'ViewContent', nome: 'Grupo no Telegram',          cat: 'comunidade' },
    youtube:     { evento: 'ViewContent', nome: 'Rotina do Trezoitão',        cat: 'comunidade' },
    newsletter:  { evento: 'ViewContent', nome: 'Newsletter Substack',        cat: 'comunidade' },
    nostr:       { evento: 'ViewContent', nome: 'Nostr',                      cat: 'comunidade' },
    binance:     { evento: 'ViewContent', nome: 'Binance',                    cat: 'exchange' },
    bybit:       { evento: 'ViewContent', nome: 'Bybit',                      cat: 'exchange' },
    noxpay:      { evento: 'ViewContent', nome: 'Noxpay Crossramp',           cat: 'exchange' },
    stackbit:    { evento: 'ViewContent', nome: 'Stackbit',                   cat: 'exchange' },
  };

  document.addEventListener('click', (ev) => {
    if (!window.LNTrack) return;
    if (ev.target.closest('[data-copy]')) return; // copiar não é clique no link
    const alvo = ev.target.closest('[data-cta]');
    if (!alvo) return;
    const info = CTA[alvo.dataset.cta];
    if (!info) return;

    /* trava curta: toque repetido por impaciência não vira duas conversões */
    if (alvo.dataset.enviado) return;
    alvo.dataset.enviado = '1';
    setTimeout(() => { delete alvo.dataset.enviado; }, 3000);

    LNTrack.track(info.evento, {
      custom: { content_name: info.nome, content_category: info.cat },
    });
  });
})();
