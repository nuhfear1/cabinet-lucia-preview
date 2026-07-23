(() => {
  'use strict';

  const configured = window.CABINET_LUCIA_BACKEND_CONFIG || {};
  const baseUrl = typeof configured.baseUrl === 'string' ? configured.baseUrl.trim().replace(/\/$/, '') : '';

  window.CABINET_LUCIA_BACKEND = Object.freeze({
    enabled: configured.enabled === true && /^https:\/\//i.test(baseUrl),
    baseUrl,
    timeoutMs: Number.isFinite(configured.timeoutMs) ? Math.min(Math.max(configured.timeoutMs, 1000), 15000) : 8000,
    environment: typeof configured.environment === 'string' ? configured.environment : 'preview'
  });
})();
