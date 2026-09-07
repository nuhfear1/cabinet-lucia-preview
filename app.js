(() => {
  'use strict';

  const version = '20260907-scroll-stability';
  const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${src}?v=${version}`;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    document.head.appendChild(script);
  });

  const boot = () => {
    const ordered = [
      'navigation.js',
      'enhancements.js',
      'backend-config.js',
      'public-api.js',
      'public-config.js',
      'assistant.js',
      'booking.js',
      'patient-portal.js',
      'premium.js'
    ];

    return Promise.all(ordered.map(load));
  };

  boot().catch((error) => {
    console.error('Initialisation partielle du site public.', error);
  });
})();
