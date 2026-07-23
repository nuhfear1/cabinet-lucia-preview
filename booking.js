(() => {
  'use strict';

  const init = () => {
    const form = document.querySelector('[data-booking-wizard]');
    if (!form) return;

    const steps = [...form.querySelectorAll('[data-booking-step]')];
    const progress = [...document.querySelectorAll('[data-progress-step]')];
    const status = document.getElementById('booking-status');
    const result = document.getElementById('booking-result');
    const submitButton = form.querySelector('[type="submit"]');
    let current = 1;
    let submissionKey = window.CabinetLuciaApi?.createIdempotencyKey?.() || `booking-${Date.now()}`;

    const selectedSlot = () => form.querySelector('input[name="slot"]:checked');

    const fieldError = (field, message = '') => {
      const error = field?.closest('.field, .slot-choice-group, .consent-field')?.querySelector('.field-error');
      if (field) field.toggleAttribute('aria-invalid', Boolean(message));
      if (error) error.textContent = message;
    };

    const localDateTimeToIso = (date, time) => {
      const value = new Date(`${date}T${time}:00`);
      return Number.isNaN(value.getTime()) ? '' : value.toISOString();
    };

    const summary = () => {
      const values = {
        reason: form.reason.selectedOptions[0]?.textContent || '—',
        place: form.place.selectedOptions[0]?.textContent || '—',
        slot: form.date.value && selectedSlot()?.value ? `${form.date.value} à ${selectedSlot().value}` : '—',
        name: `${form.firstName.value.trim()} ${form.lastName.value.trim()}`.trim() || '—',
        contact: [form.phone.value.trim(), form.email.value.trim()].filter(Boolean).join(' · ') || '—'
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
        const itemNumber = Number(item.dataset.progressStep);
        item.classList.toggle('active', itemNumber === current);
        item.classList.toggle('complete', itemNumber < current);
        itemNumber === current ? item.setAttribute('aria-current', 'step') : item.removeAttribute('aria-current');
      });
      if (current === 4) summary();
      if (status) status.textContent = `Étape ${current} sur 4`;
      steps.find((step) => !step.hidden)?.querySelector('h2, select, input, button')?.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const required = (field, message, state) => {
      if (field.value.trim()) {
        fieldError(field);
        return;
      }
      fieldError(field, message);
      state.first ||= field;
      state.valid = false;
    };

    const validate = () => {
      const state = { valid: true, first: null };

      if (current === 1) {
        required(form.reason, 'Choisissez un motif de rendez-vous.', state);
        required(form.place, 'Choisissez un cabinet.', state);
      }

      if (current === 2) {
        required(form.date, 'Choisissez une date souhaitée.', state);
        if (!selectedSlot()) {
          const error = form.querySelector('.slot-choice-group .field-error');
          if (error) error.textContent = 'Choisissez un horaire souhaité.';
          state.first ||= form.querySelector('input[name="slot"]');
          state.valid = false;
        }
      }

      if (current === 3) {
        required(form.firstName, 'Indiquez votre prénom.', state);
        required(form.lastName, 'Indiquez votre nom.', state);
        required(form.phone, 'Indiquez un numéro de téléphone.', state);
        if (form.phone.value.trim() && form.phone.value.trim().length < 6) {
          fieldError(form.phone, 'Le numéro de téléphone est trop court.');
          state.first ||= form.phone;
          state.valid = false;
        }
        if (form.email.value.trim() && !form.email.validity.valid) {
          fieldError(form.email, 'Indiquez une adresse e-mail valide.');
          state.first ||= form.email;
          state.valid = false;
        }
      }

      if (current === 4 && !form.consent.checked) {
        fieldError(form.consent, 'Votre accord est nécessaire pour transmettre la demande.');
        state.first ||= form.consent;
        state.valid = false;
      }

      if (!state.valid) state.first?.focus();
      return state.valid;
    };

    const payload = () => ({
      firstName: form.firstName.value.trim(),
      lastName: form.lastName.value.trim(),
      phone: form.phone.value.trim(),
      email: form.email.value.trim(),
      reason: form.reason.value,
      location: form.place.value,
      preferredAt: localDateTimeToIso(form.date.value, selectedSlot()?.value || ''),
      consent: form.consent.checked
    });

    form.addEventListener('click', (event) => {
      if (event.target.closest('[data-booking-next]') && validate()) show(Math.min(current + 1, 4));
      if (event.target.closest('[data-booking-back]')) show(Math.max(current - 1, 1));
    });

    form.addEventListener('input', (event) => {
      if (event.target.matches('input,select')) fieldError(event.target);
      if (event.target.matches('input,select') && current < 4) submissionKey = window.CabinetLuciaApi?.createIdempotencyKey?.() || `booking-${Date.now()}`;
    });

    form.addEventListener('change', (event) => {
      if (!event.target.matches('input[name="slot"]')) return;
      form.querySelectorAll('.slot-choice').forEach((label) => label.classList.remove('selected'));
      event.target.closest('.slot-choice')?.classList.add('selected');
      const error = form.querySelector('.slot-choice-group .field-error');
      if (error) error.textContent = '';
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (!validate()) return;

      submitButton.disabled = true;
      result.textContent = '';
      const client = window.CabinetLuciaApi;

      if (!client || !client.getConfig().enabled) {
        result.innerHTML = '<strong>Parcours de démonstration terminé.</strong><br>Aucune donnée n’a été transmise. La connexion au portail reste volontairement désactivée.';
        result.focus();
        submitButton.disabled = false;
        return;
      }

      try {
        const response = await client.submitAppointmentRequest(payload(), submissionKey);
        if (!response.enabled || !response.data?.requestId) throw new Error('Réponse de transmission invalide.');
        result.innerHTML = '<strong>Votre demande a bien été transmise.</strong><br>Le secrétariat pourra la consulter et vous recontacter pour confirmer le rendez-vous.';
        form.querySelectorAll('input, select, button').forEach((control) => { control.disabled = true; });
      } catch (error) {
        console.error('Échec de transmission de la demande de rendez-vous.', error);
        result.innerHTML = '<strong>La demande n’a pas pu être transmise.</strong><br>Aucune confirmation n’a été créée. Réessayez plus tard ou contactez le secrétariat.';
        submitButton.disabled = false;
      }
      result.focus();
    });

    const minimumDate = new Date();
    minimumDate.setDate(minimumDate.getDate() + 1);
    form.date.min = minimumDate.toISOString().slice(0, 10);
    show(1);
  };

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
