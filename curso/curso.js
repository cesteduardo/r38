/* ============================================================
   R38TAO · Curso
   1) Animação de entrada (cenas), igual às outras páginas
   2) Formulário do e-book
   3) Verificação de número oficial
   4) Modais: Política de Privacidade / Termos de Uso
   5) Ano do rodapé
   6) Rastreio dos cliques (Meta Pixel + CAPI, via ../tracking.js)
   ============================================================ */
(() => {
  'use strict';

  /* 1) Animação de entrada */
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

  /* 1b) Header (receita do site da GR Brands)
     Vira pílula flutuante (.preso) depois de 24px de rolagem. O link da
     seção que está na tela ganha .atual (fio laranja). O hambúrguer abre
     o menu numerado; fecha no link, no Esc ou tocando de novo. */
  const cab = document.getElementById('cab');
  const burger = cab.querySelector('.cab__burger');
  const menuM = document.getElementById('menu-m');
  const linksNav = [...cab.querySelectorAll('.cab__nav a')];
  const secoes = [...document.querySelectorAll('section[data-secao]')];

  const atualiza = () => {
    cab.classList.toggle('preso', scrollY > 24);
    let atual = null;
    secoes.forEach((s) => { if (s.getBoundingClientRect().top < innerHeight * .4) atual = s; });
    const nome = atual ? atual.dataset.secao : '';
    linksNav.forEach((a) => a.classList.toggle('atual', a.dataset.secao === nome));
  };
  addEventListener('scroll', atualiza, { passive: true });
  atualiza();

  const menu = (abre) => {
    menuM.hidden = !abre;
    burger.setAttribute('aria-expanded', String(abre));
    burger.setAttribute('aria-label', abre ? 'Fechar menu' : 'Abrir menu');
    document.body.classList.toggle('travado', abre);
  };
  burger.addEventListener('click', () => menu(menuM.hidden));
  menuM.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menuM.hidden) menu(false); });

  /* 1b2) Vitrine dos treinamentos (abas acessíveis)
     Clique, toque ou teclado (setas, Home, End) trocam o painel. No
     desktop, passar o mouse pela lista também troca, com um respiro
     curto para não piscar quando o mouse só atravessa. */
  const vitrine = document.querySelector('.vitrine');
  if (vitrine) {
    const abas = [...vitrine.querySelectorAll('.vitrine__aba')];
    const paineis = abas.map((a) => document.getElementById(a.getAttribute('aria-controls')));
    vitrine.classList.add('pronta');

    const lista = vitrine.querySelector('.vitrine__lista');
    const escolhe = (i, foco, rola) => {
      abas.forEach((a, j) => {
        const sel = i === j;
        a.setAttribute('aria-selected', String(sel));
        a.tabIndex = sel ? 0 : -1;
        paineis[j].classList.toggle('ativo', sel);
      });
      if (foco) abas[i].focus();
      /* no celular, a aba escolhida vem para o centro da faixa de abas.
         Só na horizontal e só quando a pessoa escolhe: scrollIntoView
         rolava a página inteira até os cursos logo ao carregar. */
      if (rola && matchMedia('(max-width: 899px)').matches) {
        lista.scrollTo({ left: abas[i].offsetLeft - (lista.clientWidth - abas[i].offsetWidth) / 2, behavior: 'smooth' });
      }
    };
    /* abre já com a aba escolhida centrada na faixa (só rolagem horizontal da lista) */
    escolhe(Math.max(0, abas.findIndex((a) => a.getAttribute('aria-selected') === 'true')), false, true);

    let espera;
    abas.forEach((a, i) => {
      a.addEventListener('click', () => escolhe(i, false, true));
      a.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse') return;
        clearTimeout(espera);
        espera = setTimeout(() => escolhe(i), 110);
      });
      a.addEventListener('pointerleave', () => clearTimeout(espera));
      a.addEventListener('keydown', (e) => {
        const ult = abas.length - 1;
        const mapa = { ArrowDown: i + 1, ArrowRight: i + 1, ArrowUp: i - 1, ArrowLeft: i - 1, Home: 0, End: ult };
        if (!(e.key in mapa)) return;
        e.preventDefault();
        escolhe((mapa[e.key] + abas.length) % abas.length, true, true);
      });
    });
  }

  /* 1b3) R38 do rodapé: máquina de escrever
     R38 → apaga "38" → digita "enato 38tão" → pausa → apaga até "R"
     → digita "38" → pausa → recomeça. Só roda com o rodapé na tela;
     com "reduzir movimento", fica parado em R38 (o cursor ainda pisca). */
  const dig = document.querySelector('.digita__texto');
  if (dig && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const pinta = (t) => {
      /* o "38" (onde quer que esteja) vai em laranja */
      const i = t.indexOf('38');
      dig.innerHTML = '';
      if (i < 0) { dig.textContent = t; return; }
      dig.append(t.slice(0, i));
      const em = document.createElement('em');
      em.textContent = t.slice(i, i + 2);
      dig.append(em, t.slice(i + 2));
    };
    const espera = (ms) => new Promise((r) => setTimeout(r, ms));
    const ate = async (de, para, vel) => {
      /* apaga até o prefixo comum e digita o resto */
      let t = de, k = 0;
      while (k < de.length && k < para.length && de[k] === para[k]) k++;
      while (t.length > k) { t = t.slice(0, -1); pinta(t); await espera(vel * .6); }
      while (t.length < para.length) { t = para.slice(0, t.length + 1); pinta(t); await espera(vel + Math.random() * 40); }
      return t;
    };
    let rodando = false, visivel = false;
    const ciclo = async () => {
      if (rodando) return;
      rodando = true;
      let t = 'R38';
      while (visivel) {
        await espera(1800);
        if (!visivel) break;
        t = await ate(t, 'Renato 38tão', 85);
        await espera(2400);
        t = await ate(t, 'R38', 85);
      }
      pinta('R38');
      rodando = false;
    };
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach((e) => { visivel = e.isIntersecting; if (visivel) ciclo(); })).observe(dig);
    }
  }

  /* 1b4) Frases que sobem de trás do bloco seguinte ("É ou não é?" atrás
     da fita, "É o quê? Hm?" atrás do banner), conforme a rolagem */
  const frases = [...document.querySelectorAll('.pergunta-sobe')];
  if (frases.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const pares = frases.map((f) => [f, f.nextElementSibling]);
    const sobe = () => pares.forEach(([f, capa]) => {
      const r = capa.getBoundingClientRect();
      /* começa um pouco antes do bloco aparecer (105% da tela) e termina
         quando ele chega a 78% dela: a frase sobe inteira em pouca rolagem */
      const p = Math.min(1, Math.max(0, (innerHeight * 1.05 - r.top) / (innerHeight * .27)));
      f.style.setProperty('--sobe', p.toFixed(3));
    });
    addEventListener('scroll', sobe, { passive: true });
    addEventListener('resize', sobe);
    sobe();
  }

  /* 1c) Fita de fotos: duplica para o loop contínuo (o CSS anda -50%) */
  const trilho = document.querySelector('.fita__trilho');
  if (trilho) trilho.append(...[...trilho.children].map((n) => n.cloneNode(true)));

  /* 1d) Manifesto: as palavras acendem conforme a frase sobe na tela */
  const palavras = [...document.querySelectorAll('.manifesto-a__frase span')];
  const frase = document.querySelector('.manifesto-a__frase');
  if (frase && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const acende = () => {
      const r = frase.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * .85 - r.top) / (innerHeight * .5)));
      const n = Math.round(p * palavras.length);
      palavras.forEach((w, i) => w.classList.toggle('acesa', i < n));
    };
    addEventListener('scroll', acende, { passive: true });
    acende();
  } else {
    palavras.forEach((w) => w.classList.add('acesa'));
  }

  /* 2) Formulário do e-book
     ENVIO_EBOOK: endereço que recebe o cadastro (o mesmo que o site atual
     usa para mandar o e-book por e-mail). Enquanto estiver vazio, o
     formulário valida e mostra a confirmação, mas não envia nada. */
  const ENVIO_EBOOK = '';

  const form = document.querySelector('.form');
  const nota = form.querySelector('.form__nota');
  const notaOriginal = nota.textContent;

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    let ok = true;
    form.querySelectorAll('.campo, .aceite').forEach((el) => el.classList.remove('erro'));
    const nome = form.nome, email = form.email, aceite = form.aceite;
    if (nome.value.trim().length < 3) { nome.closest('.campo').classList.add('erro'); ok = false; }
    if (!/^\S+@\S+\.\S+$/.test(email.value.trim())) { email.closest('.campo').classList.add('erro'); ok = false; }
    if (!aceite.checked) { aceite.closest('.aceite').classList.add('erro'); ok = false; }
    if (!ok) {
      nota.classList.remove('ok');
      nota.textContent = 'Confira os campos destacados.';
      form.querySelector('.erro input')?.focus();
      return;
    }

    const dados = Object.fromEntries(new FormData(form));
    if (ENVIO_EBOOK) {
      try {
        await fetch(ENVIO_EBOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dados) });
      } catch (e) { /* segue: a confirmação não depende da resposta */ }
    }
    if (window.LNTrack) {
      LNTrack.lead({
        user: LNTrack.userFrom ? LNTrack.userFrom({ nome: dados.nome, email: dados.email, telefone: dados.telefone }) : undefined,
        custom: { content_name: 'E-book Bitcoin Red Pill', content_category: 'ebook' },
      });
    }
    nota.classList.add('ok');
    nota.textContent = `Pronto, ${dados.nome.split(' ')[0]}! O e-book vai chegar no seu e-mail.`;
    form.reset();
    setTimeout(() => { nota.classList.remove('ok'); nota.textContent = notaOriginal; }, 9000);
  });

  /* 3) Verificação de número oficial
     OFICIAIS: números oficiais da equipe, só dígitos com DDI (ex.: '5511988887777').
     Preencher com a lista que o cliente mandar. */
  const OFICIAIS = [];

  const vf = document.querySelector('.verificar__form');
  const res = vf.querySelector('.verificar__res');
  /* ícones do resultado: <template> no HTML (check e alerta) */
  const ico = (id) => document.getElementById(id).innerHTML;
  const mostra = (tipo, texto) => {
    res.hidden = false;
    res.className = 'verificar__res ' + tipo;
    res.innerHTML = (tipo === 'ok' ? ico('ico-ok') : tipo === 'nao' ? ico('ico-nao') : '') + '<span></span>';
    res.querySelector('span').textContent = texto;
    /* reinicia a animação de entrada a cada verificação */
    res.style.animation = 'none'; void res.offsetWidth; res.style.animation = '';
  };
  vf.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const n = vf.querySelector('input').value.replace(/\D/g, '');
    if (n.length < 10) { mostra('aviso', 'Digite o número completo, com DDD.'); return; }
    const oficial = OFICIAIS.some((o) => o.endsWith(n) || n.endsWith(o));
    if (oficial) mostra('ok', 'Número oficial. Pode conversar com segurança.');
    else mostra('nao', 'Este número não é oficial. Não envie dados nem dinheiro.');
  });

  /* 4) Modais */
  const FOCAVEIS = 'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])';
  let aberto = null, voltarPara = null;
  const focaveis = (m) => [...m.querySelectorAll(FOCAVEIS)].filter((el) => el.offsetParent !== null);
  const abrir = (id) => {
    const m = document.getElementById(id);
    if (!m || aberto) return;
    voltarPara = document.activeElement;
    m.hidden = false; m.classList.add('aberto');
    document.body.classList.add('travado');
    aberto = m;
    const corpo = m.querySelector('.modal__corpo');
    corpo.scrollTop = 0; corpo.focus();
  };
  const fechar = () => {
    if (!aberto) return;
    aberto.classList.remove('aberto'); aberto.hidden = true;
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
    const l = focaveis(aberto), p = l[0], u = l[l.length - 1], a = document.activeElement;
    if (!aberto.contains(a)) { ev.preventDefault(); p.focus(); }
    else if (ev.shiftKey && a === p) { ev.preventDefault(); u.focus(); }
    else if (!ev.shiftKey && a === u) { ev.preventDefault(); p.focus(); }
  });

  /* 5) Ano do rodapé */
  document.getElementById('ano').textContent = new Date().getFullYear();

  /* 6) Rastreio: clique em curso ou mentoria é intenção de compra */
  document.addEventListener('click', (ev) => {
    if (!window.LNTrack) return;
    const alvo = ev.target.closest('[data-cta]');
    if (!alvo || alvo.dataset.enviado) return;
    alvo.dataset.enviado = '1';
    setTimeout(() => { delete alvo.dataset.enviado; }, 3000);
    LNTrack.track('InitiateCheckout', { custom: { content_name: alvo.dataset.nome, content_category: alvo.dataset.cta } });
  });
})();
