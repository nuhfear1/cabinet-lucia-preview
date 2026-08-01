(() => {
  'use strict';
  const init = () => {
    const link = document.getElementById('patient-portal-link');
    const portalUrl = window.CABINET_LUCIA_BACKEND?.patientPortalUrl;
    if (!link || !portalUrl || !window.CABINET_LUCIA_BACKEND.isSafeHttpsUrl(portalUrl)) return;
    link.href = portalUrl;
    link.hidden = false;
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
