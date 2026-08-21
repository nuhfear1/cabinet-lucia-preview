const { cleanupChrome, createCdpTarget, launchChrome } = require('./chrome-launcher.cjs');

const baseUrl = process.env.PUBLIC_SITE_URL || 'http://127.0.0.1:4173';
const viewports = [
  { name: 'desktop', width: 1440, height: 1000, mobile: false },
  { name: 'mobile', width: 390, height: 844, mobile: true }
];

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      if (message.error) pending.reject(new Error(message.error.message));
      else pending.resolve(message.result || {});
    };
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function connect(webSocketDebuggerUrl) {
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Erreur JavaScript pendant la recette assistant.');
  return result.result?.value;
}

async function navigate(client, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile
  });
  await client.send('Page.navigate', { url: `${baseUrl}/index.html` });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(client, 'document.readyState') === 'complete') {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Chargement impossible (${viewport.name}).`);
}

async function runViewport(client, viewport) {
  await navigate(client, viewport);
  return evaluate(client, `(async () => {
    const failures = [];
    const assert = (condition, message) => { if (!condition) failures.push(message); };
    document.getElementById('assistant-btn')?.click();
    const panel = document.getElementById('assistant');
    const form = document.getElementById('assistant-form');
    const input = document.getElementById('assistant-input');
    const submit = form?.querySelector('[type="submit"]');
    const messages = document.getElementById('assistant-messages');
    assert(Boolean(panel && !panel.hidden), 'assistant non ouvert');

    const ask = async ({ question, mock, expected, urgent = false, maxWaitMs = 2500 }) => {
      const before = messages.querySelectorAll('.assistant-message.bot:not(.assistant-typing)').length;
      window.CabinetLuciaApi = mock;
      let typingAppeared = false;
      const observer = new MutationObserver((records) => {
        typingAppeared ||= records.some((record) => [...record.addedNodes].some((node) => node.nodeType === 1 && node.matches('.assistant-message.bot.assistant-typing')));
      });
      observer.observe(messages, { childList: true });
      input.value = question;
      form.requestSubmit();
      const deadline = Date.now() + maxWaitMs;
      while (Date.now() < deadline) {
        if (messages.querySelectorAll('.assistant-message.bot:not(.assistant-typing)').length > before && !input.disabled && !submit.disabled) break;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      observer.disconnect();
      const answer = messages.querySelectorAll('.assistant-message.bot:not(.assistant-typing)')[before];
      const text = answer?.textContent || '';
      return {
        typingAppeared,
        typingRemoved: !messages.querySelector('.assistant-typing'),
        text,
        expected: text.includes(expected),
        noRawBold: !text.includes('**'),
        urgent: Boolean(answer?.classList.contains('urgent')),
        inputEnabled: !input.disabled,
        submitEnabled: !submit.disabled
      };
    };

    const enabled = (status, answer) => ({
      getConfig: () => ({ enabled: true, timeoutMs: 1200 }),
      askAssistant: async () => ({ enabled: true, data: { status, answer } })
    });

    const known = await ask({
      question: 'Où se trouve le cabinet de Sainte-Rose ?',
      mock: enabled('answer', 'Le cabinet de Sainte-Rose se trouve à **Place Tricolore - 88J3+W89, Av. Sainte-Rose de Lima, 97115 Sainte-Rose, Guadeloupe.**'),
      expected: 'Place Tricolore - 88J3+W89'
    });
    assert(known.expected && known.noRawBold, 'réponse connue ou suppression ** incorrecte');

    const unknown = await ask({
      question: 'Quelle est la couleur du bureau ?',
      mock: enabled('unknown', 'Je n’ai pas trouvé cette information sur le site. Je préfère ne pas vous donner une réponse incertaine.'),
      expected: 'Je n’ai pas trouvé cette information sur le site'
    });
    assert(unknown.expected, 'réponse inconnue incorrecte');

    const medical = await ask({
      question: 'Peux-tu interpréter mon ECG ?',
      mock: enabled('medical_refusal', 'Je ne peux pas interpréter une situation médicale personnelle.'),
      expected: 'Je ne peux pas interpréter une situation médicale personnelle.'
    });
    assert(medical.expected && !medical.urgent, 'refus médical incorrect');

    const emergency = await ask({
      question: 'J’ai une douleur dans la poitrine et je fais un malaise',
      mock: enabled('emergency', 'Je ne peux pas évaluer une urgence médicale. Contactez immédiatement le 15 ou le 112.'),
      expected: 'Contactez immédiatement le 15 ou le 112.',
      urgent: true
    });
    assert(emergency.expected && emergency.urgent, 'urgence incorrecte');

    const providerFallback = await ask({
      question: 'Trouver un cabinet',
      mock: {
        getConfig: () => ({ enabled: true, timeoutMs: 1200 }),
        askAssistant: async () => { throw new Error('provider unavailable'); }
      },
      expected: 'Les adresses et itinéraires sont regroupés sur la page des cabinets.'
    });
    assert(providerFallback.expected, 'fallback provider indisponible incorrect');

    const timeoutFallback = await ask({
      question: 'Trouver un cabinet',
      mock: {
        getConfig: () => ({ enabled: true, timeoutMs: 1000 }),
        askAssistant: async () => new Promise(() => {})
      },
      expected: 'Les adresses et itinéraires sont regroupés sur la page des cabinets.',
      maxWaitMs: 1800
    });
    assert(timeoutFallback.expected, 'fallback timeout incorrect');

    for (const [name, result] of Object.entries({ known, unknown, medical, emergency, providerFallback, timeoutFallback })) {
      assert(result.typingAppeared, 'indicateur absent: ' + name);
      assert(result.typingRemoved, 'indicateur non supprimé: ' + name);
      assert(result.inputEnabled && result.submitEnabled, 'contrôles bloqués: ' + name);
    }

    const rect = panel.getBoundingClientRect();
    assert(rect.left >= 0 && rect.right <= innerWidth && rect.top >= 0 && rect.bottom <= innerHeight, 'panneau hors viewport');
    return { failures, viewport: ${JSON.stringify(viewport.name)} };
  })()`);
}

async function main() {
  const launched = await launchChrome();
  const failures = [];
  try {
    const target = await createCdpTarget(launched);
    const client = await connect(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');
    for (const viewport of viewports) {
      const result = await runViewport(client, viewport);
      for (const failure of result.failures) failures.push(`${viewport.name}: ${failure}`);
    }
  } finally {
    await cleanupChrome(launched);
  }
  if (failures.length) throw new Error(`Recette assistant finale échouée:\n- ${failures.join('\n- ')}`);
  console.log('Recette assistant finale: OK (known/unknown/refus médical/urgence/provider fallback/timeout, desktop+mobile).');
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
