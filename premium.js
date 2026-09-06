(() => {
  'use strict';
  if (document.documentElement.dataset.premiumUi === 'true') return;
  document.documentElement.dataset.premiumUi = 'true';

  const ready = (fn) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();

  ready(() => {
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
