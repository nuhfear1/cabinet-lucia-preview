(() => {
  'use strict';
  const getBackendConfig = () => window.CABINET_LUCIA_BACKEND || { enabled: false, baseUrl: '', timeoutMs: 8000 };

  const submitToBackend = async (payload) => {
    const config = getBackendConfig();
    if (!config.enabled || !config.baseUrl) return null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 8000);
    try {
      const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/api/public/appointment-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Appointment backend unavailable: ${response.status}`);
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  };

  const init = () => {
    const form = document.querySelector('[data-booking-wizard]');
    if (!form) return;
    const steps = [...form.querySelectorAll('[data-booking-step]')];
    const progress = [...document.querySelectorAll('[data-progress-step]')];
    const status = document.getElementById('booking-status');
    const result = document.getElementById('booking-result');
    let current = 1;

    const selectedSlot = () => form.querySelector('input[name="slot"]:checked');
    const fieldError = (field, message = '') => {
      const error = field?.closest('.field')?.querySelector('.field-error');
      if (field) field.toggleAttribute('aria-invalid', Boolean(message));
      if (error) error.textContent = message;
    };
    const summary = () => {
      const values = {
        reason: form.reason.selectedOptions[0]?.textContent || '—',
        place: form.place.selectedOptions[0]?.textContent || '—',
        slot: selectedSlot()?.value || '—',
        name: form.name.value.trim() || '—',
        contact: form.contact.value.trim() || '—'
      };
      Object.entries(values).forEach(([key, value]) => {
        const target = document.querySelector(`[data-summary="${key}"]`);
        if (target) target.textContent = value;
      });
    };
    const show = (number) => {
      current = number;
      steps.forEach((step) => { step.hidden = Number(step.dataset.bookingStep) !== current; });
      progress.forEach((item) => {
        const number = Number(item.dataset.progressStep);
        item.classList.toggle('active', number === current);
        item.classList.toggle('complete', number < current);
        number === current ? item.setAttribute('aria-current', 'step') : item.removeAttribute('aria-current');
      });
      if (current === 4) summary();
      if (status) status.textContent = `Étape ${current} sur 4`;
      steps.find((step) => !step.hidden)?.querySelector('h2, select, input, button')?.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const validate = () => {
      let valid = true;
      let first = null;
      const required = (field, message) => {
        if (field.value.trim()) return fieldError(field);
        fieldError(field, message);
        first ||= field;
        valid = false;
      };
      if (current === 1) {
        required(form.reason, 'Choisissez un motif de rendez-vous.');
        required(form.place, 'Choisissez un cabinet.');
      }
      if (current === 2 && !selectedSlot()) {
        form.querySelector('.slot-choice-group .field-error').textContent = 'Choisissez un créneau de démonstration.';
        first = form.querySelector('input[name="slot"]');
        valid = false;
      }
      if (current === 3) {
        required(form.name, 'Indiquez votre nom et votre prénom.');
        required(form.contact, 'Indiquez un téléphone ou une adresse e-mail.');
      }
      if (!valid) first?.focus();
      return valid;
    };

    form.addEventListener('click', (event) => {
      if (event.target.closest('[data-booking-next]') && validate()) show(Math.min(current + 1, 4));
      if (event.target.closest('[data-booking-back]')) show(Math.max(current - 1, 1));
    });
    form.addEventListener('input', (event) => { if (event.target.matches('input,select')) fieldError(event.target); });
    form.addEventListener('change', (event) => {
      if (!event.target.matches('input[name="slot"]')) return;
      form.querySelectorAll('.slot-choice').forEach((label) => label.classList.remove('selected'));
      event.target.closest('.slot-choice')?.classList.add('selected');
      form.querySelector('.slot-choice-group .field-error').textContent = '';
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitButton = form.querySelector('[type="submit"]');
      submitButton.disabled = true;
      const config = getBackendConfig();
      if (!config.enabled || !config.baseUrl) {
        result.innerHTML = '<strong>Parcours de démonstration terminé.</strong><br>Aucun rendez-vous réel n’a été enregistré. La connexion au portail est prête mais reste volontairement désactivée.';
        result.focus();
        return;
      }
      const fullName = form.name.value.trim().split(/\s+/);
      const contact = form.contact.value.trim();
      const payload = {
        firstName: fullName.shift() || '',
        lastName: fullName.join(' ') || 'Non renseigné',
        phone: contact.includes('@') ? '' : contact,
        email: contact.includes('@') ? contact : '',
        reason: form.reason.value,
        location: form.place.value,
        preferredAt: selectedSlot()?.value || ''
      };
      try {
        await submitToBackend(payload);
        result.innerHTML = '<strong>Votre demande a bien été transmise.</strong><br>Le secrétariat pourra la consulter dans le portail de préproduction.';
      } catch (error) {
        console.error(error);
        result.innerHTML = '<strong>La demande n’a pas pu être transmise.</strong><br>Aucune donnée n’a été enregistrée. Réessayez plus tard ou contactez le secrétariat.';
        submitButton.disabled = false;
      }
      result.focus();
    });
    show(1);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
