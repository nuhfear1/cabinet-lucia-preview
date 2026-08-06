(() => {
  'use strict';

  const defaults = {
    enabled: true,
    baseUrl: 'https://cabinet-lucia-medical-platform.osc-fr1.scalingo.io',
    timeoutMs: 8000,
    environment: 'production',
    patientPortalUrl: ''
  };
  const configured = window.CABINET_LUCIA_BACKEND_CONFIG || defaults;
  window.CABINET_LUCIA_BACKEND_CONFIG = { ...defaults, ...configured };

  const normalizeUrl = (value) => typeof value === 'string' ? value.trim().replace(/\/$/, '') : '';
  const isSafeHttpsUrl = (value) => {
    const normalized = normalizeUrl(value);
    try {
      const url = new URL(normalized);
      return url.protocol === 'https:'
        && !/(^|\.)(localhost|.*\.invalid)$/i.test(url.hostname)
        && !/example/i.test(url.hostname)
        && !url.username
        && !url.password;
    } catch {
      return false;
    }
  };

  const baseUrl = normalizeUrl(configured.baseUrl);
  const patientPortalUrl = normalizeUrl(configured.patientPortalUrl);
  const environment = typeof configured.environment === 'string' ? configured.environment : defaults.environment;
  const activeEnvironment = environment === 'production' || environment === 'staging';

  window.CABINET_LUCIA_BACKEND = Object.freeze({
    enabled: configured.enabled === true && activeEnvironment && isSafeHttpsUrl(baseUrl),
    baseUrl: isSafeHttpsUrl(baseUrl) ? baseUrl : '',
    timeoutMs: Number.isFinite(configured.timeoutMs) ? Math.min(Math.max(configured.timeoutMs, 1000), 15000) : defaults.timeoutMs,
    environment,
    patientPortalUrl: isSafeHttpsUrl(patientPortalUrl) ? patientPortalUrl : '',
    isSafeHttpsUrl
  });
})();
