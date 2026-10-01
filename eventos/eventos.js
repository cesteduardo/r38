/* ============================================================
   R38TAO · Próximos encontros
   1) Animação de entrada (cenas)
   2) Galeria infinita de países
   3) Filtro por região + busca
   4) Modais: Política de Privacidade / Termos de Uso
   5) Ano do rodapé
   6) Rastreio dos cliques (Meta Pixel + CAPI, via ../tracking.js)
   ============================================================ */
(() => {
  'use strict';

  const calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1) Animação de entrada: mesma regra da página de links */
  const cenas = [...document.querySelectorAll('.cena')];
  cenas.forEach((c) => c.querySelectorAll(':scope .a').forEach((el, i) => el.style.setProperty('--i', i)));
  const ve = (c) => c.classList.add('visto');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (e.isIntersecting) { ve(e.target); io.unobserve(e.target); }
    }), { threshold: 0.05 });
    cenas.forEach((c) => io.observe(c));
  } else {
    cenas.forEach(ve);
  }

  /* 2) Galeria infinita
     Os cards são duplicados (a cópia some para leitores de tela e para o
     Tab). O scroll anda sozinho; ao passar de uma volta inteira, recua uma
     volta: como as duas metades são iguais, o salto não aparece.
     Pausa com o mouse em cima, com foco dentro e enquanto há toque; volta
     a andar um pouco depois. Arrastar com o mouse também funciona. */
  const trilho = document.querySelector('.galeria__trilho');
  if (trilho && !calmo) {
    const originais = [...trilho.children];
    originais.forEach((card) => {
      const copia = card.cloneNode(true);
      copia.setAttribute('aria-hidden', 'true');
      copia.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
      trilho.appendChild(copia);
    });

    const volta = () => {
      return trilho.children[originais.length].offsetLeft - trilho.children[0].offsetLeft;
    };

    const VEL = 34; // px por segundo
    let pos = 0, antes = 0, parado = false, retoma = 0, alvo = null;

    const passo = (t) => {
      const dt = antes ? Math.min((t - antes) / 1000, .05) : 0;
      antes = t;
      if (alvo !== null) {
        /* deslize dos botões: aproxima com desaceleração */
        pos += (alvo - pos) * Math.min(1, dt * 9);
        if (Math.abs(alvo - pos) < .5) {
          pos = alvo; alvo = null;
          const v = volta();
          if (pos >= v) pos -= v;
        }
        trilho.scrollLeft = pos;
      } else if (!parado && !document.hidden && t > retoma) {
        pos += VEL * dt;
        const v = volta();
        if (pos >= v) pos -= v;
        trilho.scrollLeft = pos;
      } else {
        pos = trilho.scrollLeft;
      }
      requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);

    /* se a pessoa rolar à mão até o fim ou o começo, dá a volta também */
    trilho.addEventListener('scroll', () => {
      if (alvo !== null) return;
      const v = volta();
      if (trilho.scrollLeft >= v * 1.5) trilho.scrollLeft -= v;
      else if (trilho.scrollLeft <= 2 && parado) trilho.scrollLeft += v;
    }, { passive: true });

    /* botões: um ingresso para cada lado, e a galeria volta a andar depois */
    const largura = () => trilho.children[1].offsetLeft - trilho.children[0].offsetLeft;
    document.querySelectorAll('.galeria__btn').forEach((b) => b.addEventListener('click', () => {
      const v = volta();
      const dir = Number(b.dataset.dir);
      pos = alvo ?? trilho.scrollLeft;
      if (dir < 0 && pos - largura() < 0) { pos += v; trilho.scrollLeft = pos; }
      alvo = pos + dir * largura();
      retoma = performance.now() + 4000;
    }));

    const pausa = () => { parado = true; };
    const solta = (ms = 1800) => { parado = false; retoma = performance.now() + ms; };

    trilho.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') pausa(); });
    trilho.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') solta(400); });
    trilho.addEventListener('touchstart', pausa, { passive: true });
    trilho.addEventListener('touchend', () => solta(2500), { passive: true });
    trilho.addEventListener('focusin', pausa);
    trilho.addEventListener('focusout', () => solta(800));

    /* arrastar com o mouse */
    let x0 = null, s0 = 0, moveu = false;
    trilho.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      x0 = e.clientX; s0 = trilho.scrollLeft; moveu = false;
    });
    addEventListener('pointermove', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 5) { moveu = true; trilho.classList.add('arrastando'); }
      if (moveu) trilho.scrollLeft = s0 - dx;
    });
    addEventListener('pointerup', () => {
      if (x0 === null) return;
      x0 = null;
      setTimeout(() => trilho.classList.remove('arrastando'), 0);
    });
  }

  /* 3) Filtro por região + busca (valem juntos) */
  const botoes = [...document.querySelectorAll('.filtros button')];
  const itensBr = [...document.querySelectorAll('.lista--grade .item')];
  const campo = document.querySelector('.busca input');
  const vazio = document.querySelector('.vazio');
  let regiao = 'todas';

  const normaliza = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  const aplica = () => {
    const q = normaliza(campo.value);
    let n = 0;
    itensBr.forEach((el) => {
      const ok = (regiao === 'todas' || el.dataset.regiao === regiao) && (!q || el.dataset.busca.includes(q));
      if (ok && el.hidden && !calmo) {
        el.classList.remove('surge'); void el.offsetWidth; el.classList.add('surge');
        el.style.setProperty('--i', n);
      }
      el.hidden = !ok;
      if (ok) n++;
    });
    vazio.hidden = n > 0;
  };

  botoes.forEach((b) => b.addEventListener('click', () => {
    regiao = b.dataset.regiao;
    botoes.forEach((x) => x.setAttribute('aria-pressed', x === b));
    aplica();
  }));
  campo.addEventListener('input', aplica);

  /* 4) Modais */
  const FOCAVEIS = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let aberto = null;
  let voltarPara = null;
  const focaveis = (modal) => [...modal.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null);

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
  document.querySelectorAll('[data-modal]').forEach((b) => b.addEventListener('click', () => abrir(b.dataset.modal)));
  document.querySelectorAll('[data-fechar]').forEach((b) => b.addEventListener('click', fechar));
  document.addEventListener('keydown', (ev) => {
    if (!aberto) return;
    if (ev.key === 'Escape') { ev.preventDefault(); fechar(); return; }
    if (ev.key !== 'Tab') return;
    const lista = focaveis(aberto);
    const primeiro = lista[0], ultimo = lista[lista.length - 1], atual = document.activeElement;
    if (!aberto.contains(atual)) { ev.preventDefault(); primeiro.focus(); }
    else if (ev.shiftKey && atual === primeiro) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && atual === ultimo) { ev.preventDefault(); primeiro.focus(); }
  });

  /* 4b) Calendário
     AGENDA é a única coisa a editar quando uma data for confirmada.
     Formato de cada encontro:
       { data: '2026-11-21', cidade: 'São Paulo', pais: 'Brasil',
         local: 'Nome do lugar', link: 'https://t.me/...' }
     Cidade com data sai da lista "Datas a confirmar" sozinha. */
  const AGENDA = [];

  const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho',
                 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const cal = document.querySelector('.cal');
  if (cal) {
    const nomeMes = cal.querySelector('.cal__nome');
    const dias = cal.querySelector('.cal__dias');
    const lista = cal.querySelector('.cal__lista');
    const pendentes = cal.querySelector('.cal__pendentes');
    const hoje = new Date();
    const futuros = AGENDA.map((e) => ({ ...e, d: new Date(e.data + 'T12:00:00') }))
      .sort((a, b) => a.d - b.d);
    const prox = futuros.find((e) => e.d >= new Date(hoje.toDateString()));
    let mes = prox ? new Date(prox.d.getFullYear(), prox.d.getMonth(), 1) : new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    /* cidades sem data: lidas da própria página (galeria original + Brasil) */
    const comData = new Set(futuros.map((e) => normaliza(e.cidade)));
    const cidades = [...document.querySelectorAll('.pais:not([aria-hidden]) .item, .lista--grade .item')];
    pendentes.innerHTML = '';
    cidades.forEach((a) => {
      if (comData.has(normaliza(a.dataset.nome))) return;
      const pais = a.closest('.pais');
      const rotulo = pais ? pais.querySelector('.pais__nome').textContent : a.querySelector('.item__ico').textContent;
      const el = document.createElement('a');
      el.className = 'cal__chip';
      el.href = a.href; el.target = '_blank'; el.rel = 'noopener';
      el.dataset.cta = a.dataset.cta; el.dataset.nome = a.dataset.nome;
      el.innerHTML = `<b></b><span></span>`;
      el.querySelector('b').textContent = a.dataset.nome;
      el.querySelector('span').textContent = rotulo;
      pendentes.appendChild(el);
    });

    const desenha = () => {
      nomeMes.textContent = `${MESES[mes.getMonth()]} ${mes.getFullYear()}`;
      dias.innerHTML = '';
      const ini = mes.getDay();
      const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
      const doMes = futuros.filter((e) => e.d.getMonth() === mes.getMonth() && e.d.getFullYear() === mes.getFullYear());
      for (let i = 0; i < ini; i++) dias.appendChild(document.createElement('span'));
      for (let d = 1; d <= total; d++) {
        const el = document.createElement('span');
        el.className = 'cal__dia';
        el.textContent = d;
        const data = new Date(mes.getFullYear(), mes.getMonth(), d);
        if (data.toDateString() === hoje.toDateString()) el.classList.add('hoje');
        if (doMes.some((e) => e.d.getDate() === d)) el.classList.add('tem');
        el.style.setProperty('--i', d);
        dias.appendChild(el);
      }
      lista.innerHTML = doMes.length ? '' : '<p class="cal__vazio">Nenhum encontro com data confirmada neste mês.</p>';
      doMes.forEach((e) => {
        const a = document.createElement('a');
        a.className = 'item'; a.href = e.link || '#'; a.target = '_blank'; a.rel = 'noopener';
        a.dataset.cta = 'evento'; a.dataset.nome = e.cidade;
        a.innerHTML = `<span class="item__ico item__ico--letra"></span><span class="item__nome"></span><span class="chip"></span>`;
        a.querySelector('.item__ico').textContent = String(e.d.getDate()).padStart(2, '0');
        a.querySelector('.item__nome').textContent = e.local ? `${e.cidade} · ${e.local}` : e.cidade;
        a.querySelector('.chip').textContent = e.pais || '';
        lista.appendChild(a);
      });
      dias.classList.remove('troca'); void dias.offsetWidth; dias.classList.add('troca');
    };

    cal.querySelectorAll('.cal__nav').forEach((b) => b.addEventListener('click', () => {
      mes = new Date(mes.getFullYear(), mes.getMonth() + Number(b.dataset.mes), 1);
      desenha();
    }));
    document.querySelectorAll('[data-modal="modalCalendario"]').forEach((b) => b.addEventListener('click', desenha));
    desenha();
  }

  /* 5) Ano do rodapé */
  document.getElementById('ano').textContent = new Date().getFullYear();

  /* 6) Rastreio: entrar no grupo de uma cidade é pedir para ser avisado
     do encontro, então conta como Lead, com a cidade no content_name. */
  const CTA = {
    evento: { evento: 'Lead', cat: 'evento-exterior' },
    grupo:  { evento: 'Lead', cat: 'evento-brasil' },
  };
  document.addEventListener('click', (ev) => {
    if (!window.LNTrack) return;
    const alvo = ev.target.closest('[data-cta]');
    if (!alvo) return;
    const info = CTA[alvo.dataset.cta];
    if (!info || alvo.dataset.enviado) return;
    alvo.dataset.enviado = '1';
    setTimeout(() => { delete alvo.dataset.enviado; }, 3000);
    LNTrack.track(info.evento, { custom: { content_name: alvo.dataset.nome, content_category: info.cat } });
  });
})();
