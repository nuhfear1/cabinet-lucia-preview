const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

const baseUrl = process.env.PUBLIC_SITE_URL || 'http://127.0.0.1:4173';
const reportPath = process.env.TECHNICAL_RECIPE_REPORT || '/tmp/public-technical-recipe.json';
const pages = [
  'index.html',
  'docteure.html',
  'consultations.html',
  'prevention.html',
  'cabinets.html',
  'rendez-vous.html',
  'faq.html',
  'mentions-legales.html',
  'confidentialite.html',
  'accessibilite.html',
  'article-ecg.html'
];
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true }
];

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ].filter(Boolean);
  for (const candidate of candidates) if (fs.existsSync(candidate)) return candidate;
  for (const command of ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser']) {
    try {
      const resolved = execFileSync('which', [command], { encoding: 'utf8' }).trim();
      if (resolved) return resolved;
    } catch {}
  }
  throw new Error('Navigateur Chromium introuvable sur le système de recette.');
}

async function waitForJson(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw lastError || new Error(`Délai dépassé pour ${url}`);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result || {});
        return;
      }
      for (const listener of this.listeners.get(message.method) || []) listener(message.params || {});
    };
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }
}

async function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Connexion CDP impossible.')), 10000);
    socket.onopen = () => { clearTimeout(timeout); resolve(); };
    socket.onerror = () => { clearTimeout(timeout); reject(new Error('Erreur de connexion CDP.')); };
  });
  return new CdpClient(socket);
}

async function evaluate(client, expression) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Erreur JavaScript pendant la recette.');
  return result.result?.value;
}

async function waitForPage(client) {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const state = await evaluate(client, 'document.readyState');
    if (state === 'complete') {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('La page ne termine pas son chargement.');
}

async function navigate(client, page, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile
  });
  await client.send('Page.navigate', { url: `${baseUrl}/${page}` });
  await waitForPage(client);
}

async function inspectPage(client) {
  return evaluate(client, `(() => {
    const visible = (element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
    };
    const accessibleName = (element) => {
      const labelledBy = element.getAttribute('aria-labelledby');
      const labelledText = labelledBy ? labelledBy.split(/\\s+/).map((id) => document.getElementById(id)?.textContent || '').join(' ') : '';
      return [element.getAttribute('aria-label'), labelledText, element.textContent, element.querySelector('img')?.alt, element.title]
        .filter(Boolean).join(' ').trim();
    };
    const controls = [...document.querySelectorAll('input:not([type="hidden"]), select, textarea')].filter(visible);
    const unlabeledControls = controls.filter((control) => {
      if (control.closest('label')) return false;
      if (control.id && document.querySelector('label[for="' + CSS.escape(control.id) + '"]')) return false;
      return !control.getAttribute('aria-label') && !control.getAttribute('aria-labelledby') && !control.title;
    }).map((control) => control.name || control.id || control.outerHTML.slice(0, 80));
    const emptyInteractive = [...document.querySelectorAll('a, button')].filter(visible).filter((element) => !accessibleName(element))
      .map((element) => element.outerHTML.slice(0, 100));
    const ids = [...document.querySelectorAll('[id]')].map((element) => element.id);
    const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    const navigation = performance.getEntriesByType('navigation')[0];
    return {
      title: document.title.trim(),
      lang: document.documentElement.lang,
      h1Count: document.querySelectorAll('h1').length,
      hasMain: Boolean(document.querySelector('main#main-content')),
      hasHeader: Boolean(document.querySelector('header')),
      hasFooter: Boolean(document.querySelector('footer')),
      hasSkipLink: Boolean(document.querySelector('.skip-link[href="#main-content"]')),
      horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
      missingImageAlt: [...document.querySelectorAll('img:not([alt])')].map((img) => img.src),
      unlabeledControls,
      emptyInteractive,
      duplicateIds,
      durationMs: navigation ? Math.round(navigation.duration) : null,
      internalLinks: [...document.querySelectorAll('a[href]')].map((link) => new URL(link.href, location.href).href)
        .filter((href) => href.startsWith(location.origin))
    };
  })()`);
}

async function checkInternalLinks(links, failures) {
  const unique = [...new Set(links)];
  for (const link of unique) {
    const url = new URL(link);
    url.hash = '';
    const response = await fetch(url, { redirect: 'manual' });
    assert(response.status < 400, `Lien interne indisponible (${response.status}) : ${url.href}`, failures);
  }
}

async function checkNavigationAndAssistant(client, failures) {
  const viewport = viewports.find((item) => item.name === 'mobile');
  await navigate(client, 'index.html', viewport);
  const menuOpened = await evaluate(client, `(() => {
    const toggle = document.querySelector('.mobile-toggle');
    const nav = document.getElementById('main-navigation');
    toggle?.click();
    return Boolean(toggle && nav && toggle.getAttribute('aria-expanded') === 'true' && nav.classList.contains('open'));
  })()`);
  assert(menuOpened, 'Le menu mobile ne s’ouvre pas correctement.', failures);
  await client.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape' });
  await client.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape' });
  const menuClosed = await evaluate(client, `(() => {
    const toggle = document.querySelector('.mobile-toggle');
    const nav = document.getElementById('main-navigation');
    return Boolean(toggle && nav && toggle.getAttribute('aria-expanded') === 'false' && !nav.classList.contains('open') && document.activeElement === toggle);
  })()`);
  assert(menuClosed, 'La touche Échap ne ferme pas correctement le menu mobile.', failures);

  const assistantOpened = await evaluate(client, `(() => {
    const button = document.getElementById('assistant-btn');
    const assistant = document.getElementById('assistant');
    button?.click();
    return Boolean(button && assistant && !assistant.hidden && button.getAttribute('aria-expanded') === 'true');
  })()`);
  assert(assistantOpened, 'L’assistant public ne s’ouvre pas correctement.', failures);
  const assistantClosed = await evaluate(client, `(() => {
    document.getElementById('close-assistant')?.click();
    const button = document.getElementById('assistant-btn');
    const assistant = document.getElementById('assistant');
    return Boolean(button && assistant && assistant.hidden && button.getAttribute('aria-expanded') === 'false');
  })()`);
  assert(assistantClosed, 'L’assistant public ne se ferme pas correctement.', failures);

  const skipLinkFocusable = await evaluate(client, `(() => {
    const link = document.querySelector('.skip-link');
    link?.focus();
    return document.activeElement === link;
  })()`);
  assert(skipLinkFocusable, 'Le lien d’accès direct au contenu ne peut pas recevoir le focus.', failures);
}

async function checkBooking(client, failures) {
  await navigate(client, 'rendez-vous.html', viewports[0]);
  const result = await evaluate(client, `(async () => {
    const form = document.querySelector('[data-booking-wizard]');
    const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const setValue = (selector, value) => {
      const field = document.querySelector(selector);
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    };
    let focusedField = '';
    form.addEventListener('focusin', (event) => {
      focusedField = event.target?.name || event.target?.id || '';
    });
    setValue('[name="reason"]', 'Suivi cardiologique');
    setValue('[name="place"]', 'MORNE_A_LEAU');
    document.querySelector('[data-booking-next]').click();
    const tomorrow = new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10);
    setValue('[name="date"]', tomorrow);
    const slot = document.querySelector('[name="slot"][value="09:00"]');
    slot.checked = true;
    slot.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelector('[data-booking-step="2"] [data-booking-next]').click();
    let requests = 0;
    window.CabinetLuciaApi.submitAppointmentRequest = async () => { requests += 1; };
    setValue('[name="firstName"]', ' A ');
    setValue('[name="lastName"]', 'Nom');
    setValue('[name="phone"]', '0690000000');
    focusedField = '';
    document.querySelector('[data-booking-step="3"] [data-booking-next]').click();
    await nextFrame();
    const shortFirstNameRejected = !document.querySelector('[data-booking-step="3"]').hidden
      && form.firstName.getAttribute('aria-invalid') === 'true';
    const shortFirstNameFocused = focusedField === 'firstName';
    setValue('[name="firstName"]', 'Al');
    setValue('[name="lastName"]', ' B ');
    focusedField = '';
    document.querySelector('[data-booking-step="3"] [data-booking-next]').click();
    await nextFrame();
    const shortLastNameRejected = !document.querySelector('[data-booking-step="3"]').hidden
      && form.lastName.getAttribute('aria-invalid') === 'true';
    const shortLastNameFocused = focusedField === 'lastName';
    setValue('[name="lastName"]', 'Bo');
    document.querySelector('[data-booking-step="3"] [data-booking-next]').click();
    const twoCharacterNamesAccepted = !document.querySelector('[data-booking-step="4"]').hidden;
    document.querySelector('[data-booking-step="4"] [data-booking-back]').click();
    setValue('[name="firstName"]', 'Marie');
    setValue('[name="lastName"]', 'Recette');
    setValue('[name="phone"]', '0690000000');
    setValue('[name="email"]', 'marie.recette@example.test');
    document.querySelector('[data-booking-step="3"] [data-booking-next]').click();
    const step4 = document.querySelector('[data-booking-step="4"]');
    const summary = step4?.textContent || '';
    const consent = document.querySelector('[name="consent"]');
    consent.checked = true;
    consent.dispatchEvent(new Event('input', { bubbles: true }));
    form.requestSubmit();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return {
      step4Visible: Boolean(step4 && !step4.hidden),
      summaryOk: summary.includes('Marie Recette') && summary.includes('Morne-à-l’Eau') && summary.includes('Suivi cardiologique'),
      consentRequired: consent.required,
      resultText: document.getElementById('booking-result')?.textContent || '',
      backendEnabled: window.CabinetLuciaApi?.getConfig?.().enabled,
      shortFirstNameRejected,
      shortFirstNameFocused,
      shortLastNameRejected,
      shortLastNameFocused,
      twoCharacterNamesAccepted,
      invalidRequests: requests
    };
  })()`);
  assert(result.step4Visible, 'Le parcours de rendez-vous n’atteint pas l’étape de vérification.', failures);
  assert(result.summaryOk, 'Le récapitulatif du rendez-vous est incomplet.', failures);
  assert(result.consentRequired, 'Le consentement n’est pas obligatoire.', failures);
  assert(result.backendEnabled === false, 'Le backend public doit rester désactivé pendant cette recette.', failures);
  assert(result.resultText.includes('Aucune donnée n’a été transmise'), 'Le mode de démonstration ne confirme pas clairement l’absence de transmission.', failures);
  assert(result.shortFirstNameRejected, 'Un prénom d’un caractère, espaces extérieurs compris, doit être refusé.', failures);
  assert(result.shortFirstNameFocused, 'Le champ prénom invalide doit recevoir le focus.', failures);
  assert(result.shortLastNameRejected, 'Un nom d’un caractère, espaces extérieurs compris, doit être refusé.', failures);
  assert(result.shortLastNameFocused, 'Le champ nom invalide doit recevoir le focus.', failures);
  assert(result.twoCharacterNamesAccepted, 'Les prénoms et noms de deux caractères doivent être acceptés.', failures);
  assert(result.invalidRequests === 0, 'Une validation de nom incorrecte ne doit déclencher aucune requête.', failures);
}

async function main() {
  const failures = [];
  const results = [];
  const browserErrors = [];
  const badResponses = [];
  const chromePath = findChrome();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cabinet-lucia-chrome-'));
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--hide-scrollbars',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  try {
    await waitForJson('http://127.0.0.1:9222/json/version');
    const targetResponse = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
    if (!targetResponse.ok) throw new Error('Impossible de créer l’onglet de recette.');
    const target = await targetResponse.json();
    const client = await connectCdp(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    await client.send('Log.enable');
    await client.send('Network.enable');
    client.on('Runtime.exceptionThrown', ({ exceptionDetails }) => browserErrors.push(exceptionDetails?.exception?.description || exceptionDetails?.text || 'Erreur JavaScript inconnue'));
    client.on('Log.entryAdded', ({ entry }) => { if (entry?.level === 'error') browserErrors.push(entry.text); });
    client.on('Network.responseReceived', ({ response }) => {
      if (response?.url?.startsWith(baseUrl) && response.status >= 400) badResponses.push(`${response.status} ${response.url}`);
    });

    const allLinks = [];
    for (const viewport of viewports) {
      for (const page of pages) {
        await navigate(client, page, viewport);
        const inspection = await inspectPage(client);
        results.push({ page, viewport: viewport.name, ...inspection });
        allLinks.push(...inspection.internalLinks);
        assert(Boolean(inspection.title), `${page} (${viewport.name}) : titre de page absent.`, failures);
        assert(inspection.lang === 'fr', `${page} (${viewport.name}) : langue du document incorrecte.`, failures);
        assert(inspection.h1Count === 1, `${page} (${viewport.name}) : ${inspection.h1Count} titre(s) principal(aux) au lieu d’un.`, failures);
        assert(inspection.hasMain, `${page} (${viewport.name}) : contenu principal absent ou mal identifié.`, failures);
        assert(inspection.hasHeader && inspection.hasFooter, `${page} (${viewport.name}) : en-tête ou pied de page absent.`, failures);
        assert(inspection.hasSkipLink, `${page} (${viewport.name}) : lien d’accès direct au contenu absent.`, failures);
        assert(inspection.horizontalOverflow <= 2, `${page} (${viewport.name}) : débordement horizontal de ${inspection.horizontalOverflow}px.`, failures);
        assert(inspection.missingImageAlt.length === 0, `${page} (${viewport.name}) : image sans texte alternatif.`, failures);
        assert(inspection.unlabeledControls.length === 0, `${page} (${viewport.name}) : champ sans libellé (${inspection.unlabeledControls.join(', ')}).`, failures);
        assert(inspection.emptyInteractive.length === 0, `${page} (${viewport.name}) : lien ou bouton sans nom accessible.`, failures);
        assert(inspection.duplicateIds.length === 0, `${page} (${viewport.name}) : identifiants HTML dupliqués (${inspection.duplicateIds.join(', ')}).`, failures);
        assert(inspection.durationMs === null || inspection.durationMs < 5000, `${page} (${viewport.name}) : chargement local anormalement lent (${inspection.durationMs} ms).`, failures);
      }
    }

    await checkInternalLinks(allLinks, failures);
    await checkNavigationAndAssistant(client, failures);
    await checkBooking(client, failures);
    for (const error of [...new Set(browserErrors)]) failures.push(`Erreur JavaScript navigateur : ${error}`);
    for (const response of [...new Set(badResponses)]) failures.push(`Ressource interne indisponible : ${response}`);
  } finally {
    chrome.kill('SIGTERM');
    fs.rmSync(userDataDir, { recursive: true, force: true });
  }

  const report = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    browser: chromePath,
    pages,
    viewports,
    results,
    failures,
    limitations: [
      'La CI gratuite exécute Chromium. Safari, Firefox et Edge restent à vérifier manuellement sur leurs systèmes réels.',
      'La conformité juridique, les contenus médicaux et les informations métier ne sont pas validés par cette recette.'
    ]
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) throw new Error(`Recette publique échouée :\n- ${failures.join('\n- ')}`);
  console.log(`Recette publique réussie sur ${results.length} combinaisons page/format.`);
  console.log(`Rapport : ${reportPath}`);
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});