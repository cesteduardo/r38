/* ============================================================
   R38TAO · Luz no hover, usada nas três páginas
   Cada alvo ganha um <span class="luz">: um brilho suave que segue
   o cursor e um contorno que acende só perto dele. O desenho está
   no style.css (bloco "luz"). Sem mouse, nada disso aparece.
   ============================================================ */
(() => {
  'use strict';
  // [seletor, variante]: '' = brilho e contorno; 'clara' = botão laranja
  // (luz branca); 'fundo' = só o brilho; 'anel' = só o contorno
  const ALVOS = [
    ['.redes a, .rodape-a__redes a, .legal, .voltar, .galeria__btn, .filtros button, .chip--cupom', ''],
    ['.missao-a__site, .faq__item summary, .vitrine__aba', ''],
    ['.ebook, .btn-l, .cab__cta, .verificar__botao, .pais__botao, .cal-botao', 'clara'],
    ['.item', 'fundo'],
    ['.lista', 'anel'],
  ];

  const acender = () => {
    ALVOS.forEach(([sel, tipo]) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (el.querySelector(':scope > .luz')) return;
        const cs = getComputedStyle(el);
        if (cs.position === 'static') el.style.position = 'relative';
        el.classList.add('tem-luz');
        const luz = document.createElement('span');
        luz.className = tipo ? `luz luz--${tipo}` : 'luz';
        luz.setAttribute('aria-hidden', 'true');
        // com border de verdade, a luz cobre a borda (o inset 0 ficaria dentro dela)
        const bw = parseFloat(cs.borderTopWidth) || 0;
        if (bw) luz.style.inset = `-${bw}px`;
        el.prepend(luz);
      });
    });
  };

  // um ouvinte só: atualiza o alvo sob o cursor e os alvos que o contêm
  const mover = (e) => {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    let el = e.target.closest && e.target.closest('.tem-luz');
    while (el) {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
      el = el.parentElement && el.parentElement.closest('.tem-luz');
    }
  };

  acender();
  // as galerias e listas montadas por eventos.js/curso.js chegam depois
  window.addEventListener('load', acender);
  document.addEventListener('pointerover', mover, { passive: true });
  document.addEventListener('pointermove', mover, { passive: true });
})();
