(() => {
  'use strict';
  const load = (src) => {
    const script = document.createElement('script');
    script.src = `${src}?v=20260720-premium`;
    script.defer = true;
    document.head.appendChild(script);
  };
  ['navigation.js', 'assistant.js', 'booking.js', 'premium.js'].forEach(load);
})();
