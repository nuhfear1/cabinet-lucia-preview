const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');

const DEFAULT_COMMANDS = ['google-chrome-stable', 'google-chrome', 'chromium', 'chromium-browser'];
const OUTPUT_LIMIT = 32768;

function commandPath(command) {
  try {
    return execFileSync('sh', ['-c', 'command -v "$1"', 'resolve-chrome', command], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 2000
    }).trim();
  } catch {
    return '';
  }
}

function findChromeCandidates({ chromePath = process.env.CHROME_PATH, commands = DEFAULT_COMMANDS } = {}) {
  const paths = [chromePath, ...commands.map(commandPath), ...commands.map((name) => `/usr/bin/${name}`)].filter(Boolean);
  const unique = new Map();
  for (const candidate of paths) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const resolved = fs.realpathSync(candidate);
      if (!unique.has(resolved)) unique.set(resolved, candidate);
    } catch {}
  }
  return [...unique.values()];
}

function readBrowserVersion(binary) {
  try {
    return execFileSync(binary, ['--version'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 5000
    }).trim() || 'unknown';
  } catch {
    return 'unknown';
  }
}

function appendLimited(current, chunk, limit = OUTPUT_LIMIT) {
  const combined = current + chunk.toString();
  return combined.length > limit ? combined.slice(-limit) : combined;
}

function formatChromeFailure({ binary, commandVersion, exitCode, signal, stdout, stderr, error }) {
  return [
    'Chrome exited before CDP became ready',
    `binary: ${binary}`,
    `browserVersion: ${commandVersion}`,
    `exitCode: ${exitCode ?? 'none'}`,
    `signal: ${signal ?? 'none'}`,
    error ? `launcherError: ${error.message || error}` : null,
    `stderr:\n${stderr.trim() || '(empty)'}`,
    `stdout:\n${stdout.trim() || '(empty)'}`
  ].filter(Boolean).join('\n');
}

function observeChrome(chrome) {
  const output = {
    stdout: '', stderr: '', exited: false, closed: false, exitCode: null, signal: null, error: null
  };
  let resolveExit;
  let resolveClose;
  output.exitPromise = new Promise((resolve) => { resolveExit = resolve; });
  output.closePromise = new Promise((resolve) => { resolveClose = resolve; });
  chrome.stdout.on('data', (chunk) => { output.stdout = appendLimited(output.stdout, chunk); });
  chrome.stderr.on('data', (chunk) => { output.stderr = appendLimited(output.stderr, chunk); });
  chrome.once('error', (error) => {
    output.error = error;
    output.exited = true;
    resolveExit(output);
  });
  chrome.once('exit', (exitCode, signal) => {
    output.exitCode = exitCode;
    output.signal = signal;
    output.exited = true;
    resolveExit(output);
  });
  chrome.once('close', () => {
    output.closed = true;
    resolveClose(output);
  });
  return output;
}

async function stopChrome(chrome, output) {
  if (output.closed) return;
  if (!output.exited) chrome.kill('SIGTERM');
  await Promise.race([output.closePromise, new Promise((resolve) => setTimeout(resolve, 2000))]);
  if (!output.closed) {
    chrome.kill('SIGKILL');
    await Promise.race([output.closePromise, new Promise((resolve) => setTimeout(resolve, 2000))]);
  }
}

function readActivePort(userDataDir) {
  const activePortPath = path.join(userDataDir, 'DevToolsActivePort');
  let contents;
  try {
    contents = fs.readFileSync(activePortPath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return { state: 'missing', detail: 'DevToolsActivePort was not created' };
    return { state: 'invalid', detail: `DevToolsActivePort could not be read: ${error.message}` };
  }
  const lines = contents.split(/\r?\n/);
  const firstLine = lines[0].trim();
  if (!firstLine) return { state: 'pending', detail: 'DevToolsActivePort is empty' };
  if (!/^\d+$/.test(firstLine)) return { state: 'invalid', detail: `DevToolsActivePort contains an invalid port: ${firstLine}` };
  const port = Number(firstLine);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return { state: 'invalid', detail: `DevToolsActivePort contains an out-of-range port: ${firstLine}` };
  }
  if (!lines[1]?.trim()) return { state: 'pending', detail: 'DevToolsActivePort is only partially written' };
  return { state: 'ready', port };
}

async function fetchCdpVersion(port, timeoutMs, exitPromise, failureDetails) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const request = (async () => {
    let response;
    try {
      response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: controller.signal });
    } catch (error) {
      if (error.name === 'AbortError') throw new Error(`CDP endpoint timed out after ${timeoutMs}ms`);
      throw new Error(`CDP endpoint is inaccessible: ${error.message}`);
    }
    if (!response.ok) throw new Error(`CDP endpoint returned HTTP ${response.status}`);
    let version;
    try {
      version = JSON.parse(await response.text());
    } catch (error) {
      throw new Error(`CDP endpoint returned invalid JSON: ${error.message}`);
    }
    if (typeof version.webSocketDebuggerUrl !== 'string' || !version.webSocketDebuggerUrl) {
      throw new Error('CDP endpoint response is missing webSocketDebuggerUrl');
    }
    return version;
  })();
  try {
    return await Promise.race([
      request,
      exitPromise.then((output) => { throw new Error(formatChromeFailure({ ...failureDetails, ...output })); })
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

async function waitForChromeCdp({ chrome, binary, commandVersion, userDataDir, output, timeoutMs, fetchTimeoutMs }) {
  const deadline = Date.now() + timeoutMs;
  let activePort = { state: 'missing', detail: 'DevToolsActivePort was not created' };
  let endpointError;
  while (Date.now() < deadline) {
    if (output.exited) throw new Error(formatChromeFailure({ binary, commandVersion, ...output }));
    activePort = readActivePort(userDataDir);
    if (activePort.state === 'ready') {
      try {
        const remainingMs = Math.max(1, deadline - Date.now());
        const version = await fetchCdpVersion(
          activePort.port,
          Math.min(fetchTimeoutMs, remainingMs),
          output.exitPromise,
          { binary, commandVersion }
        );
        return { port: activePort.port, version };
      } catch (error) {
        if (output.exited) throw error;
        endpointError = error;
      }
    }
    await Promise.race([
      new Promise((resolve) => setTimeout(resolve, 50)),
      output.exitPromise
    ]);
  }
  const readiness = activePort.state === 'ready'
    ? endpointError?.message || 'CDP endpoint is inaccessible'
    : activePort.detail;
  throw new Error([
    `Chrome CDP startup timed out after ${timeoutMs}ms`,
    `binary: ${binary}`,
    `browserVersion: ${commandVersion}`,
    `readiness: ${readiness}`,
    `stderr:\n${output.stderr.trim() || '(empty)'}`,
    `stdout:\n${output.stdout.trim() || '(empty)'}`
  ].join('\n'));
}

async function launchChrome({ candidates = findChromeCandidates(), timeoutMs = 20000, fetchTimeoutMs = 1000 } = {}) {
  if (!candidates.length) throw new Error('Navigateur Chromium introuvable sur le système de recette.');
  const diagnostics = [];
  for (const binary of candidates) {
    const commandVersion = readBrowserVersion(binary);
    const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cabinet-lucia-chrome-'));
    const chrome = spawn(binary, [
      '--headless', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
      '--no-first-run', '--no-default-browser-check', '--remote-debugging-address=127.0.0.1',
      '--remote-debugging-port=0', `--user-data-dir=${userDataDir}`, 'about:blank'
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    const output = observeChrome(chrome);
    try {
      const cdp = await waitForChromeCdp({
        chrome, binary, commandVersion, userDataDir, output, timeoutMs, fetchTimeoutMs
      });
      return {
        binary, browserVersion: cdp.version.Browser || commandVersion, commandVersion,
        chrome, output, userDataDir, port: cdp.port, diagnostics
      };
    } catch (error) {
      diagnostics.push(error.message || String(error));
      await stopChrome(chrome, output);
      fs.rmSync(userDataDir, { recursive: true, force: true });
    }
  }
  throw new Error(`Aucun navigateur Chromium n’a pu démarrer :\n\n${diagnostics.join('\n\n--- next candidate ---\n\n')}`);
}

async function cleanupChrome(launched) {
  await stopChrome(launched.chrome, launched.output);
  fs.rmSync(launched.userDataDir, { recursive: true, force: true });
}

async function createCdpTarget(launched, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const request = (async () => {
    let response;
    try {
      response = await fetch(`http://127.0.0.1:${launched.port}/json/new?about:blank`, {
        method: 'PUT', signal: controller.signal
      });
    } catch (error) {
      if (error.name === 'AbortError') throw new Error(`CDP target creation timed out after ${timeoutMs}ms`);
      throw new Error(`CDP target endpoint is inaccessible: ${error.message}`);
    }
    if (!response.ok) throw new Error(`CDP target endpoint returned HTTP ${response.status}`);
    let target;
    try {
      target = JSON.parse(await response.text());
    } catch (error) {
      throw new Error(`CDP target endpoint returned invalid JSON: ${error.message}`);
    }
    if (typeof target.webSocketDebuggerUrl !== 'string' || !target.webSocketDebuggerUrl) {
      throw new Error('CDP target response is missing webSocketDebuggerUrl');
    }
    return target;
  })();
  try {
    return await Promise.race([
      request,
      launched.output.exitPromise.then((output) => {
        throw new Error(formatChromeFailure({
          binary: launched.binary, commandVersion: launched.commandVersion, ...output
        }));
      })
    ]);
  } finally {
    clearTimeout(timer);
    controller.abort();
  }
}

module.exports = {
  cleanupChrome, createCdpTarget, findChromeCandidates, launchChrome, readActivePort, readBrowserVersion
};
