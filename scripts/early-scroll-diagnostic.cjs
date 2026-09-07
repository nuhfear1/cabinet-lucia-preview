const fs = require('node:fs');
const { cleanupChrome, createCdpTarget, launchChrome } = require('./chrome-launcher.cjs');

const baseUrl = process.env.PUBLIC_SITE_URL || 'http://127.0.0.1:4173';
const reportPath = process.env.EARLY_SCROLL_REPORT || '/tmp/early-scroll-diagnostic.json';
const pages = ['index.html', 'cabinets.html', 'prevention.html', 'consultations.html'];
const profiles = [
  { name: 'desktop-dpr1', width: 1440, height: 1000, dpr: 1, mobile: false },
  { name: 'desktop-dpr2', width: 1440, height: 1000, dpr: 2, mobile: false },
  { name: 'mobile-dpr3', width: 390, height: 844, dpr: 3, mobile: true }
];
const speeds = [
  { name: 'slow', durationMs: 1800 },
  { name: 'fast', durationMs: 800 }
];
const scenarios = ['cold-early', 'warm-early', 'stabilized'];

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.onmessage = ({ data }) => {
      const message = JSON.parse(data);
      if (!message.id || !this.pending.has(message.id)) return;
      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result || {});
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
    socket.onerror = () => { clearTimeout(timeout); reject(new Error('Erreur CDP.')); };
  });
  return new CdpClient(socket);
}

async function evaluate(client, expression) {
  const response = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text || 'Évaluation JavaScript impossible.');
  return response.result?.value;
}

async function waitForState(client, acceptedStates) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const state = await evaluate(client, 'document.readyState');
    if (acceptedStates.includes(state)) return;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error(`Chargement incomplet (${acceptedStates.join(' ou ')} attendu).`);
}

async function setProfile(client, profile) {
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: profile.width,
    height: profile.height,
    deviceScaleFactor: profile.dpr,
    mobile: profile.mobile
  });
}

async function navigate(client, page, scenario) {
  if (scenario === 'cold-early') {
    await client.send('Network.clearBrowserCache');
  } else {
    await client.send('Page.navigate', { url: `${baseUrl}/${page}?diagnostic=warmup` });
    await waitForState(client, ['complete']);
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  await client.send('Page.navigate', { url: `${baseUrl}/${page}?diagnostic=${scenario}` });
  await waitForState(client, scenario === 'stabilized' ? ['complete'] : ['interactive', 'complete']);
  if (scenario === 'stabilized') await new Promise((resolve) => setTimeout(resolve, 1200));
}

function metricsByName(response) {
  return Object.fromEntries((response.metrics || []).map(({ name, value }) => [name, value]));
}

async function measure(client, durationMs) {
  const before = metricsByName(await client.send('Performance.getMetrics'));
  const browserData = await evaluate(client, `(async () => {
    const startedAt = performance.now();
    const activeAtStart = performance.getEntriesByType('resource')
      .filter((entry) => entry.responseEnd === 0).map((entry) => entry.name);
    const root = document.documentElement;
    const previousBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const distance = Math.min(
      Math.max(0, root.scrollHeight - innerHeight),
      Math.max(innerHeight * 2.5, 1600)
    );
    const intervals = [];
    let previousFrame = performance.now();
    await new Promise((resolve) => {
      const firstFrame = previousFrame;
      const frame = (now) => {
        intervals.push(now - previousFrame);
        previousFrame = now;
        const progress = Math.min(1, (now - firstFrame) / ${durationMs});
        window.scrollTo(0, Math.round(distance * progress));
        if (progress < 1) requestAnimationFrame(frame);
        else resolve();
      };
      requestAnimationFrame(frame);
    });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    root.style.scrollBehavior = previousBehavior;
    const samples = intervals.slice(2).filter(Number.isFinite);
    const resources = performance.getEntriesByType('resource').map((entry) => ({
      name: new URL(entry.name).pathname,
      type: entry.initiatorType,
      startMs: Number(entry.startTime.toFixed(1)),
      endMs: Number(entry.responseEnd.toFixed(1)),
      durationMs: Number(entry.duration.toFixed(1)),
      bytes: entry.transferSize || 0
    }));
    return {
      startedAtMs: Number(startedAt.toFixed(1)),
      frames: samples.length,
      over25ms: samples.filter((value) => value > 25).length,
      over50ms: samples.filter((value) => value > 50).length,
      maxFrameMs: Number(Math.max(0, ...samples).toFixed(2)),
      p95FrameMs: Number(([...samples].sort((a, b) => a - b)[Math.floor(samples.length * .95)] || 0).toFixed(2)),
      longTasks: (window.__earlyScroll?.longTasks || []).filter((item) => item.start >= startedAt),
      layoutShifts: (window.__earlyScroll?.layoutShifts || []).filter((item) => item.start >= startedAt),
      resources,
      css: resources.filter((entry) => entry.name.endsWith('.css')),
      images: resources.filter((entry) => /\\.(?:png|jpe?g|webp|b64|part\\d+)$/i.test(entry.name)),
      activeAtStart,
      activeAtEnd: performance.getEntriesByType('resource').filter((entry) => entry.responseEnd === 0).map((entry) => entry.name)
    };
  })()`);
  const after = metricsByName(await client.send('Performance.getMetrics'));
  browserData.cdp = {
    recalcStyleMs: Number((((after.RecalcStyleDuration || 0) - (before.RecalcStyleDuration || 0)) * 1000).toFixed(2)),
    layoutMs: Number((((after.LayoutDuration || 0) - (before.LayoutDuration || 0)) * 1000).toFixed(2)),
    scriptMs: Number((((after.ScriptDuration || 0) - (before.ScriptDuration || 0)) * 1000).toFixed(2)),
    taskMs: Number((((after.TaskDuration || 0) - (before.TaskDuration || 0)) * 1000).toFixed(2)),
    layouts: (after.LayoutCount || 0) - (before.LayoutCount || 0),
    styleRecalcs: (after.RecalcStyleCount || 0) - (before.RecalcStyleCount || 0)
  };
  return browserData;
}

async function graphicsInfo(client) {
  return evaluate(client, `(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return { renderer: 'WebGL unavailable', software: true };
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return { renderer, software: /swiftshader|software|llvmpipe/i.test(renderer) };
  })()`);
}

function summarize(results) {
  const groups = new Map();
  for (const result of results) {
    const key = `${result.scenario}/${result.speed}`;
    const current = groups.get(key) || { runs: 0, over25ms: 0, over50ms: 0, maxFrameMs: 0 };
    current.runs += 1;
    current.over25ms += result.measurement.over25ms;
    current.over50ms += result.measurement.over50ms;
    current.maxFrameMs = Math.max(current.maxFrameMs, result.measurement.maxFrameMs);
    groups.set(key, current);
  }
  return Object.fromEntries(groups);
}

(async () => {
  let launched;
  try {
    launched = await launchChrome({ disableGpu: false });
    const target = await createCdpTarget(launched);
    const client = await connect(target.webSocketDebuggerUrl);
    await Promise.all([
      client.send('Page.enable'),
      client.send('Runtime.enable'),
      client.send('Network.enable'),
      client.send('Performance.enable')
    ]);
    await client.send('Page.addScriptToEvaluateOnNewDocument', { source: `
      window.__earlyScroll = { longTasks: [], layoutShifts: [] };
      new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
        window.__earlyScroll.longTasks.push({ start: Number(entry.startTime.toFixed(1)), duration: Number(entry.duration.toFixed(1)) });
      })).observe({ type: 'longtask', buffered: true });
      new PerformanceObserver((list) => list.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) window.__earlyScroll.layoutShifts.push({ start: Number(entry.startTime.toFixed(1)), value: entry.value });
      })).observe({ type: 'layout-shift', buffered: true });
    ` });

    const results = [];
    for (const profile of profiles) {
      await setProfile(client, profile);
      for (const page of pages) {
        for (const scenario of scenarios) {
          for (const speed of speeds) {
            await navigate(client, page, scenario);
            results.push({
              page,
              profile: profile.name,
              scenario,
              speed: speed.name,
              measurement: await measure(client, speed.durationMs)
            });
          }
        }
      }
    }
    await client.send('Page.navigate', { url: `${baseUrl}/index.html?diagnostic=graphics` });
    await waitForState(client, ['interactive', 'complete']);
    const report = {
      browser: launched.browserVersion,
      graphics: await graphicsInfo(client),
      generatedAt: new Date().toISOString(),
      configuration: { pages, profiles, scenarios, speeds },
      summary: summarize(results),
      results
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ reportPath, browser: report.browser, graphics: report.graphics, summary: report.summary }, null, 2));
  } catch (error) {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  } finally {
    if (launched) await cleanupChrome(launched);
  }
})();
