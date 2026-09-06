const fs = require('node:fs');
const { cleanupChrome, createCdpTarget, launchChrome } = require('./chrome-launcher.cjs');

const baseUrl = process.env.PUBLIC_SITE_URL || 'http://127.0.0.1:4173';
const reportPath = process.env.SCROLL_PERF_REPORT || 'scroll-performance.json';
const pages = ['index.html', 'docteure.html', 'consultations.html', 'prevention.html', 'cabinets.html', 'rendez-vous.html'];
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

async function connectCdp(webSocketDebuggerUrl) {
  const socket = new WebSocket(webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Connexion CDP impossible.')), 10000);
    socket.onopen = () => { clearTimeout(timer); resolve(); };
    socket.onerror = () => { clearTimeout(timer); reject(new Error('Erreur CDP.')); };
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || 'Erreur JavaScript.');
  return result.result?.value;
}

async function waitForComplete(client) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await evaluate(client, 'document.readyState === "complete"')) {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Chargement incomplet.');
}

async function navigate(client, page, viewport) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: 1,
    mobile: viewport.mobile
  });
  await client.send('Page.navigate', { url: `${baseUrl}/${page}` });
  await waitForComplete(client);
}

async function measureScroll(client, durationMs) {
  return evaluate(client, `(async () => {
    const duration = ${durationMs};
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    if (!maxScroll) return { durationMs: duration, frames: 0, over25ms: 0, over50ms: 0, maxFrameMs: 0, p95FrameMs: 0, avgFrameMs: 0, maxScroll };
    const deltas = [];
    let last = performance.now();
    const started = last;
    await new Promise((resolve) => {
      const step = (now) => {
        deltas.push(now - last);
        last = now;
        const progress = Math.min(1, (now - started) / duration);
        window.scrollTo(0, Math.round(maxScroll * progress));
        if (progress < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    root.style.scrollBehavior = previous;
    const samples = deltas.slice(2).filter((value) => Number.isFinite(value));
    const sorted = [...samples].sort((a, b) => a - b);
    const p95 = sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0;
    const average = samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0;
    return {
      durationMs: duration,
      frames: samples.length,
      over25ms: samples.filter((value) => value > 25).length,
      over50ms: samples.filter((value) => value > 50).length,
      maxFrameMs: Number((Math.max(0, ...samples)).toFixed(2)),
      p95FrameMs: Number(p95.toFixed(2)),
      avgFrameMs: Number(average.toFixed(2)),
      maxScroll
    };
  })()`);
}

(async () => {
  let launched;
  try {
    launched = await launchChrome();
    const target = await createCdpTarget(launched);
    const client = await connectCdp(target.webSocketDebuggerUrl);
    await client.send('Page.enable');
    await client.send('Runtime.enable');

    const results = [];
    for (const viewport of viewports) {
      for (const page of pages) {
        await navigate(client, page, viewport);
        const slow = await measureScroll(client, 3200);
        await navigate(client, page, viewport);
        const fast = await measureScroll(client, 1500);
        results.push({ page, viewport: viewport.name, slow, fast });
      }
    }

    const report = {
      browser: launched.browserVersion,
      generatedAt: new Date().toISOString(),
      results
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  } finally {
    if (launched) await cleanupChrome(launched);
  }
})();
