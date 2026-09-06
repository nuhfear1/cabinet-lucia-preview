(() => {
  'use strict';
  if (document.documentElement.dataset.premiumUi === 'true') return;
  document.documentElement.dataset.premiumUi = 'true';

  const ready = (fn) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();

  ready(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const heroVisual = document.querySelector('.hero .visual');
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (heroVisual && canHover && !reducedMotion) {
      heroVisual.addEventListener('pointermove', (event) => {
        const rect = heroVisual.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        heroVisual.style.transform = `perspective(1200px) rotateY(${x * 5 - 2}deg) rotateX(${y * -4}deg) translateY(-3px)`;
      });
      heroVisual.addEventListener('pointerleave', () => {
        heroVisual.style.transform = '';
      });
    }

    const mobileNav = document.querySelector('.links');
    const mobileToggle = document.querySelector('.mobile-toggle');
    const desktopQuery = window.matchMedia('(min-width: 901px)');
    const normalizeNavigation = (event) => {
      if (!event.matches || !mobileNav || !mobileToggle) return;
      mobileNav.classList.remove('open');
      mobileToggle.setAttribute('aria-expanded', 'false');
      mobileToggle.setAttribute('aria-label', 'Ouvrir le menu');
      mobileToggle.textContent = '☰';
    };
    desktopQuery.addEventListener?.('change', normalizeNavigation);
  });
})();
