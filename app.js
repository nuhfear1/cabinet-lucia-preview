(() => {
  'use strict';

  const version = '20260805-backend-production';
  const load = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${src}?v=${version}`;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    document.head.appendChild(script);
  });

  const boot = async () => {
    const ordered = [
      'navigation.js',
      'backend-config.js',
      'public-api.js',
      'public-config.js',
      'assistant.js',
      'booking.js',
      'patient-portal.js',
      'premium.js'
    ];

    for (const src of ordered) await load(src);
  };

  boot().catch((error) => {
    console.error('Initialisation partielle du site public.', error);
  });
})();
