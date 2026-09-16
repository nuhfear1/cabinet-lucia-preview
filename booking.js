(() => {
  'use strict';

  const init = () => {
    const form = document.querySelector('[data-booking-wizard]');
    if (!form) return;

    const steps = [...form.querySelectorAll('[data-booking-step]')];
    const progress = [...document.querySelectorAll('[data-progress-step]')];
    const status = document.getElementById('booking-status');
    const availabilityStatus = document.getElementById('availability-status');
    const monthTarget = document.getElementById('availability-months');
    const dayTarget = document.getElementById('availability-days');
    const timeTarget = document.getElementById('availability-times');
    const dayHint = form.querySelector('[data-day-hint]');
    const timeHint = form.querySelector('[data-time-hint]');
    const selection = document.getElementById('availability-selection');
    const selectedDateTarget = form.querySelector('[data-selected-date]');
    const selectedTimeTarget = form.querySelector('[data-selected-time]');
    const result = document.getElementById('booking-result');
    const submitButton = form.querySelector('[type="submit"]');
    const state = { current: 1, loading: false, reason: '', months: [], month: '', date: '', startsAt: '', time: '' };
    let inFlight = false;
    let submissionKey = window.CabinetLuciaApi?.createIdempotencyKey?.() || `booking-${Date.now()}`;

    const fieldError = (field, message = '') => {
      const error = field?.closest('.field, .consent-field')?.querySelector('.field-error');
      if (field) field.toggleAttribute('aria-invalid', Boolean(message));
      if (error) error.textContent = message;
    };
    const dateParts = (date) => {
      const [year, month, day] = date.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    };
    const dateLabel = (date, weekday = false) => new Intl.DateTimeFormat('fr-FR', {
      ...(weekday ? { weekday: 'short' } : {}), day: 'numeric', month: 'long', year: weekday ? undefined : 'numeric', timeZone: 'UTC'
    }).format(dateParts(date));
    const monthLabel = (key) => {
      const [year, month] = key.split('-').map(Number);
      const label = new Intl.DateTimeFormat('fr-FR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1)));
      return label.charAt(0).toUpperCase() + label.slice(1);
    };
    const slotValue = (slot, date) => {
      const raw = typeof slot === 'string' ? slot : slot?.startsAt || slot?.value || '';
      if (!raw) return null;
      const time = (typeof slot === 'object' && slot.time) || raw.match(/T(\d{2}:\d{2})/)?.[1] || raw.match(/^(\d{2}:\d{2})/)?.[1];
      if (!time) return null;
      return { startsAt: raw.includes('T') ? raw : `${date}T${time}:00-04:00`, time };
    };
    const normalize = (data) => {
      const source = Array.isArray(data) ? data : data?.months || data?.availability || [];
      return source.map((month) => {
        const days = (month.days || month.dates || []).map((day) => {
          const date = typeof day === 'string' ? day : day.date;
          const slots = (day.slots || day.times || []).map((slot) => slotValue(slot, date)).filter(Boolean);
          return { date, slots };
        }).filter((day) => day.date && day.slots.length);
        const key = month.month || month.key || days[0]?.date?.slice(0, 7);
        return { key, label: month.label || (key ? monthLabel(key) : ''), days };
      }).filter((month) => month.key && month.days.length);
    };
    const choice = (label, value, group, selected, extra = '') => `<label class="slot-choice${selected ? ' selected' : ''}"><input type="radio" name="${group}" value="${value}"${selected ? ' checked' : ''}><span>${extra}${label}</span></label>`;
    const render = () => {
      monthTarget.innerHTML = state.months.map((month) => choice(month.label, month.key, 'availability-month', month.key === state.month)).join('');
      const month = state.months.find((item) => item.key === state.month);
      dayTarget.innerHTML = month ? month.days.map((day) => choice(dateLabel(day.date), day.date, 'availability-date', day.date === state.date, `<small>${dateLabel(day.date, true)}</small>`)).join('') : '';
      const day = month?.days.find((item) => item.date === state.date);
      timeTarget.innerHTML = day ? day.slots.map((slot) => choice(slot.time, slot.startsAt, 'availability-time', slot.startsAt === state.startsAt)).join('') : '';
      if (dayHint) dayHint.hidden = Boolean(state.month);
      if (timeHint) timeHint.hidden = Boolean(state.date);
      if (selection) selection.hidden = !(state.date && state.time);
      if (selectedDateTarget) selectedDateTarget.textContent = state.date ? dateLabel(state.date) : '—';
      if (selectedTimeTarget) selectedTimeTarget.textContent = state.time || '—';
    };
    const clearAvailability = () => Object.assign(state, { months: [], month: '', date: '', startsAt: '', time: '' });
    const loadAvailability = async (message = '') => {
      clearAvailability(); render(); state.loading = true;
      availabilityStatus.textContent = 'Chargement des disponibilités…';
      try {
        const client = window.CabinetLuciaApi;
        if (!client || !client.getConfig().enabled) throw new Error('disabled');
        const response = await client.getAvailability(form.reason.value);
        state.months = normalize(response.data);
        availabilityStatus.textContent = state.months.length ? message : 'Aucune disponibilité n’est proposée pour ce motif sur cette période.';
        render();
      } catch {
        availabilityStatus.textContent = 'Les disponibilités sont momentanément indisponibles. Veuillez réessayer.';
      } finally { state.loading = false; }
    };
    const summary = () => {
      const values = { reason: form.reason.selectedOptions[0]?.textContent || '—', place: 'Espace de santé de Perrin', slot: state.date && state.time ? `${dateLabel(state.date)} à ${state.time}` : '—', name: `${form.firstName.value.trim()} ${form.lastName.value.trim()}`.trim() || '—', contact: [form.phone.value.trim(), form.email.value.trim()].filter(Boolean).join(' · ') || '—' };
      Object.entries(values).forEach(([key, value]) => { const target = document.querySelector(`[data-summary="${key}"]`); if (target) target.textContent = value; });
    };
    const show = (number) => {
      state.current = number;
      steps.forEach((step) => { step.hidden = Number(step.dataset.bookingStep) !== number; });
      progress.forEach((item) => { const n = Number(item.dataset.progressStep); item.classList.toggle('active', n === number); item.classList.toggle('complete', n < number); n === number ? item.setAttribute('aria-current', 'step') : item.removeAttribute('aria-current'); });
      if (number === 2 && state.reason !== form.reason.value) { state.reason = form.reason.value; loadAvailability(); }
      if (number === 4) summary();
      status.textContent = `Étape ${number} sur 4`;
      steps.find((step) => !step.hidden)?.querySelector('h2, select, input, button')?.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    const required = (field, message, validation) => { if (field.value.trim()) return fieldError(field); fieldError(field, message); validation.first ||= field; validation.valid = false; };
    const validate = () => {
      const validation = { valid: true, first: null };
      if (state.current === 1) required(form.reason, 'Choisissez un motif de rendez-vous.', validation);
      if (state.current === 2) {
        const dateError = form.querySelector('[data-date-error]'); const timeError = form.querySelector('[data-time-error]');
        dateError.textContent = state.date ? '' : 'Choisissez une date disponible.';
        timeError.textContent = state.startsAt ? '' : 'Choisissez une heure disponible.';
        if (!state.date || !state.startsAt || state.loading) validation.valid = false;
      }
      if (state.current === 3) {
        required(form.firstName, 'Indiquez votre prénom.', validation); required(form.lastName, 'Indiquez votre nom.', validation); required(form.phone, 'Indiquez un numéro de téléphone.', validation);
        const firstName = form.firstName.value.trim();
        if (firstName && firstName.length < 2) { fieldError(form.firstName, 'Le prénom doit contenir au moins deux caractères.'); validation.valid = false; }
        const lastName = form.lastName.value.trim();
        if (lastName && lastName.length < 2) { fieldError(form.lastName, 'Le nom doit contenir au moins deux caractères.'); validation.valid = false; }
        if (form.email.value.trim() && !form.email.validity.valid) { fieldError(form.email, 'Indiquez une adresse e-mail valide.'); validation.valid = false; }
      }
      if (state.current === 4 && !form.consent.checked) { fieldError(form.consent, 'Votre accord est nécessaire pour confirmer le rendez-vous.'); validation.valid = false; }
      return validation.valid;
    };
    form.addEventListener('click', (event) => { if (event.target.closest('[data-booking-next]') && validate()) show(Math.min(state.current + 1, 4)); if (event.target.closest('[data-booking-back]')) show(Math.max(state.current - 1, 1)); });
    form.addEventListener('input', (event) => { if (event.target.matches('input,select')) fieldError(event.target); submissionKey = window.CabinetLuciaApi?.createIdempotencyKey?.() || `booking-${Date.now()}`; });
    form.addEventListener('change', (event) => {
      if (event.target === form.reason && state.reason && state.reason !== form.reason.value) { state.reason = ''; clearAvailability(); }
      if (event.target.name === 'availability-month') Object.assign(state, { month: event.target.value, date: '', startsAt: '', time: '' });
      if (event.target.name === 'availability-date') Object.assign(state, { date: event.target.value, startsAt: '', time: '' });
      if (event.target.name === 'availability-time') { state.startsAt = event.target.value; state.time = event.target.closest('.slot-choice')?.textContent.trim() || ''; }
      render();
    });
    form.addEventListener('submit', async (event) => {
      event.preventDefault(); if (inFlight || !validate()) return;
      inFlight = true; submitButton.disabled = true; result.textContent = '';
      const payload = { firstName: form.firstName.value.trim(), lastName: form.lastName.value.trim(), phone: form.phone.value.trim(), email: form.email.value.trim(), reason: form.reason.value, startsAt: state.startsAt, consent: form.consent.checked };
      try {
        const response = await window.CabinetLuciaApi.bookAppointment(payload, submissionKey); const data = response.data;
        if (!response.enabled || data?.ok !== true || data.status !== 'CONFIRMED' || !data.appointmentId || !data.startsAt) throw new Error('Réponse de réservation invalide.');
        const confirmedTime = data.startsAt.match(/T(\d{2}:\d{2})/)?.[1] || state.time;
        const confirmedDate = data.startsAt.slice(0, 10);
        result.innerHTML = `<strong>Votre rendez-vous est confirmé.</strong><p>Présentez-vous à l’Espace de santé de Perrin le ${dateLabel(confirmedDate)} à ${confirmedTime}.</p><p>4127 Route de Abdon Saman – Perrin<br>97111 Morne-à-l’Eau</p><p>La date et l’heure indiquées correspondent au moment où vous devez vous présenter à l’accueil de l’Espace de santé de Perrin.</p>`;
        form.querySelectorAll('input, select, button').forEach((control) => { control.disabled = true; });
      } catch (error) {
        if (error?.status === 409 && error?.code === 'SLOT_UNAVAILABLE') {
          state.startsAt = ''; state.time = ''; show(2);
          await loadAvailability('Ce créneau vient d’être réservé. Choisissez une autre disponibilité.');
        } else result.textContent = 'Le rendez-vous n’a pas pu être confirmé. Veuillez réessayer.';
        submitButton.disabled = false;
      } finally { inFlight = false; result.focus(); }
    });
    show(1);
  };
  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
