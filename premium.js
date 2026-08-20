(() => {
  'use strict';
  if (document.documentElement.dataset.premiumUi === 'true') return;
  document.documentElement.dataset.premiumUi = 'true';

  const ready = (fn) => document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', fn, { once: true })
    : fn();

  ready(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const header = document.querySelector('.site-header, header');

    const progress = document.createElement('div');
    progress.className = 'scroll-progress';
    progress.setAttribute('aria-hidden', 'true');
    progress.innerHTML = '<span class="scroll-progress__bar"></span>';
    document.body.prepend(progress);
    const progressBar = progress.firstElementChild;

    const backToTop = document.createElement('button');
    backToTop.type = 'button';
    backToTop.className = 'back-to-top';
    backToTop.setAttribute('aria-label', 'Revenir en haut de la page');
    backToTop.innerHTML = '↑';
    document.body.appendChild(backToTop);
    backToTop.addEventListener('click', () => window.scrollTo({
      top: 0,
      behavior: reducedMotion ? 'auto' : 'smooth'
    }));

    let ticking = false;
    let scrollRange = 1;
    let lastProgress = -1;
    let headerScrolled = null;
    let backToTopVisible = null;
    const measureScrollRange = () => {
      scrollRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    };
    const updateScrollUi = () => {
      const top = window.scrollY || document.documentElement.scrollTop;
      const progressValue = Math.min(1, top / scrollRange);
      const isHeaderScrolled = top > 18;
      const isBackToTopVisible = top > 560;

      if (progressBar && Math.abs(progressValue - lastProgress) > 0.0005) {
        progressBar.style.transform = `scaleX(${progressValue})`;
        lastProgress = progressValue;
      }
      if (headerScrolled !== isHeaderScrolled) {
        header?.classList.toggle('is-scrolled', isHeaderScrolled);
        headerScrolled = isHeaderScrolled;
      }
      if (backToTopVisible !== isBackToTopVisible) {
        backToTop.classList.toggle('is-visible', isBackToTopVisible);
        backToTopVisible = isBackToTopVisible;
      }
      ticking = false;
    };
    const requestScrollUi = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(updateScrollUi);
    };
    window.addEventListener('scroll', requestScrollUi, { passive: true });
    const refreshScrollMetrics = () => {
      measureScrollRange();
      requestScrollUi();
    };
    window.addEventListener('resize', refreshScrollMetrics, { passive: true });
    window.addEventListener('load', refreshScrollMetrics, { once: true });
    measureScrollRange();
    updateScrollUi();

    const revealTargets = [
      ...document.querySelectorAll('main .heading, main .card, main .location, main .appointment, main .media, main .panel, main .page-card, main .value-card, main details, main .dark-panel')
    ];
    revealTargets.forEach((node, index) => {
      node.dataset.premiumReveal = index % 7 === 2 ? 'left' : index % 7 === 5 ? 'right' : 'up';
      node.style.setProperty('--reveal-delay', `${Math.min(index % 4, 3) * 70}ms`);
    });

    if (reducedMotion || !('IntersectionObserver' in window)) {
      revealTargets.forEach((node) => node.classList.add('is-visible'));
    } else {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
      revealTargets.forEach((node) => observer.observe(node));
    }

    const animatedRegions = document.querySelectorAll('.hero, .page-hero');
    if (!reducedMotion && 'IntersectionObserver' in window) {
      const animationObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => entry.target.classList.toggle('decorations-paused', !entry.isIntersecting));
      });
      animatedRegions.forEach((region) => animationObserver.observe(region));
    }
    document.addEventListener('visibilitychange', () => {
      document.documentElement.classList.toggle('page-hidden', document.hidden);
    });

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
