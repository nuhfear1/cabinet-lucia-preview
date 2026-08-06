(() => {
  'use strict';

  const setText = (selector, value) => {
    if (!value) return;
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
    });
  };

  const setHref = (selector, value, scheme = '') => {
    if (!value) return;
    document.querySelectorAll(selector).forEach((element) => {
      element.href = `${scheme}${value}`;
      element.hidden = false;
    });
  };

  const applyProfile = (profile) => {
    if (!profile || typeof profile !== 'object') return;

    const displayName = String(profile.displayName || '').trim();
    const professionalTitle = String(profile.professionalTitle || '').trim();
    const specialty = String(profile.specialty || '').trim();
    const email = String(profile.email || '').trim();
    const phone = String(profile.phone || '').trim();
    const fullName = [professionalTitle, displayName].filter(Boolean).join(' ');

    setText('[data-cabinet-profile="display-name"]', displayName);
    setText('[data-cabinet-profile="professional-name"]', fullName || displayName);
    setText('[data-cabinet-profile="specialty"]', specialty);
    setText('[data-cabinet-profile="email"]', email);
    setText('[data-cabinet-profile="phone"]', phone);
    setHref('[data-cabinet-profile-link="email"]', email, 'mailto:');
    setHref('[data-cabinet-profile-link="phone"]', phone.replace(/\s+/g, ''), 'tel:');

    window.CABINET_LUCIA_PUBLIC_PROFILE = Object.freeze({ ...profile });
    document.dispatchEvent(new CustomEvent('cabinetlucia:profile-ready', { detail: profile }));
  };

  const init = async () => {
    const client = window.CabinetLuciaApi;
    if (!client || !client.getConfig().enabled || typeof client.getPublicConfig !== 'function') return;

    try {
      const response = await client.getPublicConfig();
      if (!response.enabled || !response.data) return;
      applyProfile(response.data.profile);
      window.CABINET_LUCIA_PUBLIC_RULES = Object.freeze([...(response.data.rules || [])]);
    } catch (error) {
      console.warn('Le profil public dynamique est temporairement indisponible.', error);
    }
  };

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init, { once: true })
    : init();
})();
