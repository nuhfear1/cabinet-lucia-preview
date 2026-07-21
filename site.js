(() => {
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
  ensureStyle('navigation-fixes.css?v=20260720-navfix', 'data-navigation-fixes');

  const main = document.querySelector('main');
  if (main && !main.id) main.id = 'main-content';

  if (!document.querySelector('.skip-link')) {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<a class="skip-link" href="#main-content">Aller au contenu principal</a>'
    );
  }

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
          <div class="copyright">Prévisualisation — les informations non confirmées ne constituent pas des informations médicales ou administratives définitives.</div>
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
        <div class="notice" role="note"><strong>Urgence médicale :</strong> contactez immédiatement les services d’urgence. Cet assistant ne délivre aucun avis médical.</div>
        <div class="assistant-messages" id="assistant-messages" aria-live="polite" aria-label="Conversation avec l’assistant"></div>
        <div class="assistant-suggestions" aria-label="Questions suggérées">
          <button type="button" data-assistant-query="Prendre rendez-vous">Prendre rendez-vous</button>
          <button type="button" data-assistant-query="Où se trouvent les cabinets ?">Accès aux cabinets</button>
          <button type="button" data-assistant-query="Que dois-je apporter ?">Préparer ma venue</button>
        </div>
        <form class="assistant-form" id="assistant-form">
          <label class="sr-only" for="assistant-input">Votre question</label>
          <input id="assistant-input" name="question" type="text" autocomplete="off" maxlength="240" placeholder="Écrivez votre question pratique…" required>
          <button class="button dark" type="submit">Envoyer</button>
        </form>
      </section>
      <button class="assistant-btn" id="assistant-btn" type="button" aria-controls="assistant" aria-expanded="false">♥ Besoin d’aide&nbsp;?</button>`
    );
  }
})();
