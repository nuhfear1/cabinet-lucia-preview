(() => {
  'use strict';
  const ready = (callback) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', callback, { once: true })
    : callback();

  ready(() => {
    const nav = document.querySelector('.links');
    const toggle = document.querySelector('.mobile-toggle');
    if (nav && toggle) {
      const setMenuState = (open) => {
        nav.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', String(open));
        toggle.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
        toggle.textContent = open ? '✕' : '☰';
      };
      toggle.addEventListener('click', () => setMenuState(toggle.getAttribute('aria-expanded') !== 'true'));
      nav.addEventListener('click', (event) => {
        if (event.target.closest('a')) setMenuState(false);
      });
      document.addEventListener('click', (event) => {
        if (nav.classList.contains('open') && !nav.contains(event.target) && !toggle.contains(event.target)) setMenuState(false);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && nav.classList.contains('open')) {
          setMenuState(false);
          toggle.focus();
        }
      });
    }

    const currentPage = document.body.dataset.page;
    document.querySelectorAll('[data-nav]').forEach((link) => {
      const active = link.dataset.nav === currentPage;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    document.querySelectorAll('details').forEach((detail) => {
      const summary = detail.querySelector('summary');
      if (!summary) return;
      summary.setAttribute('aria-expanded', String(detail.open));
      detail.addEventListener('toggle', () => summary.setAttribute('aria-expanded', String(detail.open)));
    });

    const script = document.createElement('script');
    script.src = 'enhancements.js?v=20260717b';
    script.defer = true;
    document.body.appendChild(script);
  });
})();
