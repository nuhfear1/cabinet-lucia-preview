(() => {
  'use strict';
  const load = (src) => {
    const script = document.createElement('script');
    script.src = `${src}?v=20260723-task7`;
    script.defer = true;
    document.head.appendChild(script);
  };
  ['navigation.js', 'backend-config.js', 'public-api.js', 'assistant.js', 'booking.js', 'patient-portal.js', 'premium.js'].forEach(load);
})();
