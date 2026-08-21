(() => {
  'use strict';

  const normalize = (value) => value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
  const responses = {
    emergency: 'Je ne peux pas évaluer une urgence médicale. Contactez immédiatement le 15 ou le 112.',
    medical_refusal: 'Je ne peux pas interpréter une situation médicale personnelle. La Docteure Lucia Cespedes-Ocampo pourra vous répondre dans le cadre d’une consultation.',
    unknown: 'Je n’ai pas trouvé cette information sur le site. Je préfère ne pas vous donner une réponse incertaine.'
  };
  const knowledge = [
    { test: /(urgence|urgent|douleur.*poitrine|mal.*poitrine|malaise|inconscient|respir|essouff|saignement)/, text: responses.emergency, status: 'emergency' },
    { test: /(diagnostic|symptome|traitement|medicament|dose|ordonnance.*modifier|resultat|analyse|interpret|mon ecg|mon echo|ma tension)/, text: responses.medical_refusal, status: 'medical_refusal' },
    { test: /(rendez-vous|rdv|reserver|reservation|creneau|disponibilite)/, text: 'Vous pouvez transmettre une demande depuis la page de rendez-vous.', link: ['rendez-vous.html', 'Prendre rendez-vous'] },
    { test: /(espace patient|preparer.*consultation|preparer.*venue|document|apporter)/, text: 'L’espace patient rassemble les informations utiles pour préparer votre consultation.', link: ['espace-patient.html', 'Accéder à l’espace patient'] },
    { test: /(adresse|cabinet|itineraire|gps|morne|sainte-rose|parking|acces)/, text: 'Les adresses et itinéraires sont regroupés sur la page des cabinets.', link: ['cabinets.html', 'Trouver un cabinet'] },
    { test: /(ecg|electrocardiogramme)/, text: 'Une fiche explique comment se déroule un ECG.', link: ['article-ecg.html', 'Comprendre l’ECG'] },
    { test: /(echographie|echo cardiaque)/, text: 'Une fiche explique comment préparer une échographie cardiaque.', link: ['article-echographie.html', 'Préparer une échographie'] },
    { test: /(prevention|tension|conseil|information)/, text: 'Les ressources de prévention sont disponibles sur le site.', link: ['prevention.html', 'Conseils de prévention'] }
  ];

  const init = () => {
    const panel = document.getElementById('assistant');
    const openButton = document.getElementById('assistant-btn');
    const closeButton = document.getElementById('close-assistant');
    const messages = document.getElementById('assistant-messages');
    const form = document.getElementById('assistant-form');
    const input = document.getElementById('assistant-input');
    const submitButton = form?.querySelector('[type="submit"]');
    if (!panel || !openButton || !closeButton || !messages || !form || !input || !submitButton) return;

    let lastFocusedElement = null;
    let responding = false;
    const append = (role, content, options = {}) => {
      const message = document.createElement('div');
      message.className = `assistant-message ${role}${options.urgent ? ' urgent' : ''}`;
      message.textContent = content;
      if (options.link) {
        message.append(document.createTextNode(' '));
        const link = document.createElement('a');
        [link.href, link.textContent] = options.link;
        message.append(link);
      }
      messages.appendChild(message);
      messages.scrollTop = messages.scrollHeight;
    };
    const open = () => {
      lastFocusedElement = document.activeElement;
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('open'));
      openButton.setAttribute('aria-expanded', 'true');
      if (!messages.children.length) append('bot', 'Bonjour. Je peux vous orienter vers les rendez-vous, les cabinets, l’espace patient et les informations pratiques du site.');
      input.focus();
    };
    const close = () => {
      panel.classList.remove('open');
      panel.hidden = true;
      openButton.setAttribute('aria-expanded', 'false');
      if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
    };
    const localAnswer = (question) => knowledge.find((entry) => entry.test.test(normalize(question))) || { text: responses.unknown };
    const answer = async (question) => {
      const fallback = () => {
        const local = localAnswer(question);
        append('bot', local.text, { link: local.link, urgent: local.status === 'emergency' });
      };
      try {
        const client = window.CabinetLuciaApi;
        if (!client || typeof client.getConfig !== 'function' || typeof client.askAssistant !== 'function') return fallback();
        const config = client.getConfig();
        if (!config || config.enabled !== true) return fallback();
        const timeoutMs = Number.isFinite(config.timeoutMs) ? Math.min(Math.max(config.timeoutMs, 1000), 15000) : 8000;
        let timeout;
        const response = await Promise.race([
          client.askAssistant(question),
          new Promise((_, reject) => { timeout = setTimeout(() => reject(new Error('Assistant timeout')), timeoutMs); })
        ]).finally(() => clearTimeout(timeout));
        const data = response.data;
        if (!response.enabled || !data || typeof data.answer !== 'string' || !data.answer.trim() || data.answer.length > 2000 || !['answer', 'unknown', 'medical_refusal', 'emergency'].includes(data.status)) throw new Error('Invalid response');
        append('bot', data.answer, { urgent: data.status === 'emergency' });
      } catch {
        fallback();
      }
    };
    const submitQuestion = async (question) => {
      if (responding || !question || question.length > 500) return;
      responding = true;
      append('user', question);
      input.disabled = true;
      submitButton.disabled = true;
      try { await answer(question); } finally {
        responding = false;
        input.disabled = false;
        submitButton.disabled = false;
        input.focus();
      }
    };

    openButton.addEventListener('click', () => panel.hidden ? open() : close());
    closeButton.addEventListener('click', close);
    panel.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    document.querySelectorAll('[data-assistant-query]').forEach((button) => button.addEventListener('click', () => submitQuestion(button.dataset.assistantQuery || button.textContent.trim())));
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const question = input.value.trim();
      if (!question) return;
      input.value = '';
      await submitQuestion(question);
    });
  };

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init, { once: true }) : init();
})();
