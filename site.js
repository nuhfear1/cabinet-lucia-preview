(() => {
  const FEATURES = Object.freeze({
    patientPortal: false
  });

  if (!FEATURES.patientPortal && document.body?.dataset?.page === 'patient') {
    window.location.replace('index.html');
    return;
  }

  const ensureStyle = (href, dataAttribute) => {
    if (document.querySelector(`link[${dataAttribute}]`)) return;
    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = href;
    stylesheet.setAttribute(dataAttribute, 'true');
    document.head.appendChild(stylesheet);
  };

  ensureStyle('ui.css?v=20260720-premium', 'data-ui-styles');
  ensureStyle('premium.css?v=20260720-premium', 'data-premium-styles');
  ensureStyle('navigation-fixes.css?v=20260819-navbar', 'data-navigation-fixes');
  ensureStyle('footer-credit.css?v=20260727-credit', 'data-footer-credit-styles');

  const hydrateImages = async () => {
    const singleImages = [...document.querySelectorAll('img[data-base64-src]')];
    const splitImages = [...document.querySelectorAll('img[data-base64-parts]')];
    const binaryImages = [...document.querySelectorAll('img[data-image-src]')];

    binaryImages.forEach((image) => {
      // These images sit in the sections reached by the first continuous scroll.
      // Let the browser fetch/decode them before scrolling starts instead of
      // paying the native lazy-loader's decode/upload cost at section entry.
      image.loading = 'eager';
      image.decoding = 'async';
      image.src = image.dataset.imageSrc;
      image.decode?.().catch(() => {});
    });

    await Promise.all([
      ...singleImages.map(async (image) => {
        image.decoding = 'async';
        const response = await fetch(image.dataset.base64Src, { cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const base64 = (await response.text()).replace(/\s+/g, '');
        const mime = image.dataset.imageMime || 'image/webp';
        image.src = `data:${mime};base64,${base64}`;
      }),
      ...splitImages.map(async (image) => {
        image.decoding = 'async';
        const parts = image.dataset.base64Parts
          .split(',')
          .map((part) => part.trim())
          .filter(Boolean);
        const responses = await Promise.all(
          parts.map((part) => fetch(part, { cache: 'force-cache' }))
        );
        responses.forEach((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
        });
        const base64Parts = await Promise.all(
          responses.map((response) => response.text())
        );
        const mime = image.dataset.imageMime || 'image/webp';
        image.src = `data:${mime};base64,${base64Parts.join('').replace(/\s+/g, '')}`;
      })
    ]);
  };

  hydrateImages().catch((error) => {
    console.error('Impossible de charger une image locale du site.', error);
  });

  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'main-content';

  if (!document.querySelector('.skip-link')) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<a class="skip-link" href="#main-content">Aller au contenu principal</a>'
    );
  }

  const patientNavLink = FEATURES.patientPortal
    ? '<a data-nav="patient" href="espace-patient.html">Espace patient</a>'
    : '';
  const patientFooterLink = FEATURES.patientPortal
    ? '<a href="espace-patient.html">Espace patient</a><br>'
    : '';
  const patientAssistantSuggestion = FEATURES.patientPortal
    ? '<button type="button" data-assistant-query="Accéder à l’espace patient">Accéder à l’espace patient</button>'
    : '';

  const headerTarget = document.getElementById('site-header');
  if (headerTarget) {
    headerTarget.innerHTML = `
      <header class="site-header">
        <div class="container nav">
          <a class="brand" href="index.html" aria-label="Accueil — Cabinet de cardiologie de la Docteure Lucia Cespedes-Ocampo">
            <span class="brandmark" aria-hidden="true">♥</span>
            <span>
              <strong>Dr Lucia Cespedes-Ocampo</strong>
              <small>Cabinet de cardiologie</small>
            </span>
          </a>
          <button class="mobile-toggle" type="button" aria-label="Ouvrir le menu" aria-controls="main-navigation" aria-expanded="false">☰</button>
          <nav class="links" id="main-navigation" aria-label="Navigation principale">
            <a data-nav="home" href="index.html">Accueil</a>
            <a data-nav="doctor" href="docteure.html">La docteure</a>
            <a data-nav="consultations" href="consultations.html">Consultations</a>
            <a data-nav="prevention" href="prevention.html">Prévention</a>
            ${patientNavLink}
            <a data-nav="locations" href="cabinets.html">Les cabinets</a>
          </nav>
          <a class="button coral nav-cta" href="rendez-vous.html">Prendre rendez-vous</a>
        </div>
      </header>`;
  }

  const footerTarget = document.getElementById('site-footer');
  if (footerTarget) {
    footerTarget.innerHTML = `
      <footer>
        <div class="container">
          <div class="footer-grid">
            <div>
              <h3>Dr Lucia Cespedes-Ocampo</h3>
              <p>Cabinet de cardiologie en Guadeloupe. Site en cours de finalisation avant sa mise en ligne définitive.</p>
            </div>
            <div>
              <strong>Navigation</strong>
              <p>
                <a href="docteure.html">La docteure</a><br>
                <a href="consultations.html">Consultations</a><br>
                <a href="prevention.html">Prévention</a><br>
                ${patientFooterLink}
                <a href="cabinets.html">Les cabinets</a><br>
                <a href="rendez-vous.html">Rendez-vous</a>
              </p>
            </div>
            <div>
              <strong>Informations</strong>
              <p>
                <a href="mentions-legales.html">Mentions légales</a><br>
                <a href="confidentialite.html">Confidentialité</a><br>
                <a href="accessibilite.html">Accessibilité</a><br>
                <a href="faq.html">Questions fréquentes</a>
              </p>
            </div>
          </div>
          <div class="copyright">
            <span>Prévisualisation — les informations non confirmées ne constituent pas des informations médicales ou administratives définitives.</span>
            <div class="footer-credit-badge" aria-label="Conçu par Gary Wilfred-Borilla, Ecom Factory — lien vers la carte de visite à ajouter">
              <img src="assets/ecom-factory-badge.svg" alt="Conçu par Gary Wilfred-Borilla — Ecom Factory, solutions digitales et IA" loading="lazy" decoding="async">
              <span class="footer-credit-badge__status">Lien à venir</span>
            </div>
          </div>
        </div>
      </footer>`;
  }

  if (!document.getElementById('assistant')) {
    document.body.insertAdjacentHTML(
      'beforeend',
      `<section class="assistant" id="assistant" role="dialog" aria-labelledby="assistant-title" aria-describedby="assistant-description" hidden>
        <div class="assistant-head">
          <div>
            <span class="assistant-kicker">Assistant du cabinet</span>
            <h2 id="assistant-title">Comment puis-je vous orienter&nbsp;?</h2>
          </div>
          <button type="button" class="assistant-close" id="close-assistant" aria-label="Fermer l’assistant">✕</button>
        </div>
        <p id="assistant-description" class="assistant-description">Je réponds uniquement aux questions pratiques déjà documentées sur le site.</p>
        <div class="notice" role="note"><strong>Urgence médicale :</strong> contactez immédiatement les services d’urgence. Cet assistant ne délivre aucun avis médical. N’indiquez pas de résultat d’examen, compte rendu, ordonnance, numéro de dossier ou autre information médicale personnelle.</div>
        <div class="assistant-messages" id="assistant-messages" aria-live="polite" aria-label="Conversation avec l’assistant"></div>
        <div class="assistant-suggestions" aria-label="Questions suggérées">
          <button type="button" data-assistant-query="Prendre rendez-vous">Prendre rendez-vous</button>
          ${patientAssistantSuggestion}
          <button type="button" data-assistant-query="Trouver un cabinet">Trouver un cabinet</button>
          <button type="button" data-assistant-query="Préparer ma consultation">Préparer ma consultation</button>
        </div>
        <form class="assistant-form" id="assistant-form">
          <label class="sr-only" for="assistant-input">Votre question</label>
          <input id="assistant-input" name="question" type="text" autocomplete="off" maxlength="500" placeholder="Écrivez votre question pratique…" required>
          <button class="button dark" type="submit">Envoyer</button>
        </form>
      </section>
      <button class="assistant-btn" id="assistant-btn" type="button" aria-controls="assistant" aria-expanded="false">♥ Besoin d’aide&nbsp;?</button>`
    );
  }
})();
