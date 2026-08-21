const { cleanupChrome, createCdpTarget, launchChrome } = require('./chrome-launcher.cjs');

const baseUrl = process.env.PUBLIC_SITE_URL || 'http://127.0.0.1:4173';
const targets = [
  {
    name: 'image 3',
    page: 'article-echographie.html',
    source: 'assets/article-echographie-hero-20260801.jpg.b64'
  },
  {
    name: 'image 6',
    page: 'article-prevention.html',
    source: 'assets/article-prevention-lifestyle-20260801.jpg.b64'
  }
];
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
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Erreur JavaScript pendant la recette images 3/6.');
  return result.result?.value;
}

async function navigate(client, target, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile
  });
  await client.send('Page.navigate', { url: `${baseUrl}/${target.page}` });
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (await evaluate(client, 'document.readyState') === 'complete') return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Chargement impossible: ${target.page} (${viewport.name}).`);
}

async function inspectTarget(client, target) {
  return evaluate(client, `(async () => {
    const failures = [];
    const image = document.querySelector('main .page-hero .image-placeholder.page-photo img[data-base64-src]');
    if (!image) return { failures: ['balise image cible introuvable'] };

    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (image.complete && image.naturalWidth > 0 && image.src.startsWith('data:image/jpeg;base64,')) break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    const rect = image.getBoundingClientRect();
    const expectedSource = ${JSON.stringify(target.source)};
    if (image.dataset.base64Src !== expectedSource) failures.push('source Base64 inattendue: ' + image.dataset.base64Src);
    if (image.dataset.imageMime !== 'image/jpeg') failures.push('MIME inattendu: ' + image.dataset.imageMime);
    if (!image.src.startsWith('data:image/jpeg;base64,')) failures.push('hydratation Data URL absente');
    if (!image.complete) failures.push('image non complète');
    if (image.naturalWidth !== 1168 || image.naturalHeight !== 784) failures.push('dimensions naturelles inattendues: ' + image.naturalWidth + 'x' + image.naturalHeight);
    if (rect.width <= 0 || rect.height <= 0) failures.push('image non rendue visuellement');

    return {
      failures,
      complete: image.complete,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      renderedWidth: Math.round(rect.width),
      renderedHeight: Math.round(rect.height),
      source: image.dataset.base64Src,
      dataUrl: image.src.startsWith('data:image/jpeg;base64,')
    };
  })()`);
}

async function main() {
  const launched = await launchChrome();
  const failures = [];
  try {
    const targetInfo = await createCdpTarget(launched);
    const client = await connect(targetInfo.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    for (const viewport of viewports) {
      for (const target of targets) {
        await navigate(client, target, viewport);
        const result = await inspectTarget(client, target);
        console.log(`${target.name} / ${viewport.name}: ${JSON.stringify(result)}`);
        for (const failure of result.failures) failures.push(`${target.name} / ${viewport.name}: ${failure}`);
      }
    }
  } finally {
    await cleanupChrome(launched);
  }

  if (failures.length) throw new Error(`Recette images 3/6 échouée:\n- ${failures.join('\n- ')}`);
  console.log('Recette point 8 images 3/6: OK (hydratation, décodage et rendu desktop/mobile).');
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
