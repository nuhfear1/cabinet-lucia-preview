(() => {
  'use strict';
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
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      form.querySelector('[type="submit"]').disabled = true;
      result.innerHTML = '<strong>Parcours de démonstration terminé.</strong><br>Aucun rendez-vous réel n’a été enregistré. La connexion à l’agenda sera ajoutée après sélection de la solution définitive.';
      result.focus();
    });
    show(1);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
