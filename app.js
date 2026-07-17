(() => {
  'use strict';
  const load = (src) => {
    const script = document.createElement('script');
    script.src = `${src}?v=20260717b`;
    script.defer = true;
    document.head.appendChild(script);
  };
  ['navigation.js', 'assistant.js', 'booking.js'].forEach(load);
})();
