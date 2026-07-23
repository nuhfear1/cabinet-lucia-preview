(() => {
  'use strict';

  const normalize = (value) => value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();
  const knowledge = [
    { test: /(urgence|urgent|douleur.*poitrine|mal.*poitrine|malaise|inconscient|respir|essouff|saignement)/, html: '<strong>Je ne peux pas évaluer une situation médicale.</strong> Contactez immédiatement les services d’urgence ou rendez-vous vers la structure d’urgence la plus proche.', urgent: true },
    { test: /(diagnostic|symptome|traitement|medicament|dose|ordonnance.*modifier|resultat|analyse|interpret)/, html: 'Je ne peux pas poser de diagnostic, interpréter un résultat ni conseiller un traitement. Pour une question médicale personnelle, contactez directement un professionnel de santé.' },
    { test: /(rendez-vous|rdv|reserver|reservation|creneau|disponibilite)/, html: 'Le parcours vous permet de choisir le motif, le cabinet et un créneau. <a href="rendez-vous.html">Ouvrir la page de rendez-vous</a>.' },
    { test: /(adresse|cabinet|itineraire|gps|morne|sainte-rose|parking|acces)/, html: 'Les adresses et itinéraires sont regroupés sur la page dédiée. <a href="cabinets.html">Voir les cabinets</a>.' },
    { test: /(document|apporter|preparer|venue|carte vitale|mutuelle|prescription|ordonnance)/, html: 'Les documents dépendent du motif. <a href="faq.html">Consulter la FAQ</a>.' },
    { test: /(ecg|electrocardiogramme)/, html: '<a href="article-ecg.html">Consulter la fiche sur l’ECG</a>.' },
    { test: /(echographie|echo cardiaque)/, html: '<a href="article-echographie.html">Consulter la fiche sur l’échographie</a>.' },
    { test: /(prevention|tension|conseil|information)/, html: '<a href="prevention.html">Accéder aux ressources de prévention</a>.' },
    { test: /(horaire|telephone|email|mail|contacter|secretariat)/, html: 'Les coordonnées et horaires définitifs seront affichés dès leur validation.' }
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

    const append = (role, content, options = {}) => {
      const message = document.createElement('div');
      message.className = `assistant-message ${role}${options.urgent ? ' urgent' : ''}`;
      if (options.html) message.innerHTML = content;
      else message.textContent = content;
      messages.appendChild(message);
      messages.scrollTop = messages.scrollHeight;
    };

    const open = () => {
      lastFocusedElement = document.activeElement;
      panel.hidden = false;
      requestAnimationFrame(() => panel.classList.add('open'));
      openButton.setAttribute('aria-expanded', 'true');
      if (!messages.children.length) append('assistant', 'Bonjour. Je peux vous orienter vers les rendez-vous, les cabinets et les informations pratiques du site.');
      input.focus();
    };

    const close = () => {
      panel.classList.remove('open');
      panel.hidden = true;
      openButton.setAttribute('aria-expanded', 'false');
      if (lastFocusedElement instanceof HTMLElement) lastFocusedElement.focus();
    };

    const answerLocal = (question) => {
      const match = knowledge.find((entry) => entry.test.test(normalize(question)));
      if (match) append('assistant', match.html, { html: true, urgent: match.urgent });
      else append('assistant', 'Je n’ai pas trouvé de réponse fiable. Consultez la <a href="faq.html">FAQ</a>. Je préfère ne pas inventer une réponse.', { html: true });
    };

    const answer = async (question) => {
      const client = window.CabinetLuciaApi;
      if (!client) return answerLocal(question);

      try {
        const response = await client.askAssistant(question);
        if (!response.enabled) return answerLocal(question);
        const data = response.data;
        if (!data || typeof data.answer !== 'string' || !['answer', 'unknown', 'medical_refusal', 'emergency'].includes(data.status)) {
          throw new Error('Réponse assistant invalide.');
        }
        append('assistant', data.answer, { urgent: data.status === 'emergency' });
      } catch (error) {
        console.warn('Assistant backend indisponible, retour au mode local sécurisé.', error);
        answerLocal(question);
      }
    };

    const submitQuestion = async (question) => {
      append('user', question);
      input.disabled = true;
      submitButton.disabled = true;
      try {
        await answer(question);
      } finally {
        input.disabled = false;
        submitButton.disabled = false;
        input.focus();
      }
    };

    openButton.addEventListener('click', () => panel.hidden ? open() : close());
    closeButton.addEventListener('click', close);
    panel.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); });
    document.querySelectorAll('[data-assistant-query]').forEach((button) => button.addEventListener('click', async () => {
      const question = button.dataset.assistantQuery || button.textContent.trim();
      await submitQuestion(question);
    }));
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
