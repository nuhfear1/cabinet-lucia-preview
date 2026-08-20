const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { cleanupChrome, launchChrome } = require('../scripts/chrome-launcher.cjs');

function makeFakeChrome(directory, name, runtimeSource) {
  const binary = path.join(directory, name);
  fs.writeFileSync(binary, `#!${process.execPath}\nif (process.argv.includes('--version')) { console.log('Fake Chrome 151.0'); process.exit(0); }\n${runtimeSource}\n`);
  fs.chmodSync(binary, 0o755);
  return binary;
}

function userDataDirExpression() {
  return `process.argv.find((arg) => arg.startsWith('--user-data-dir=')).slice('--user-data-dir='.length)`;
}

function validCdpSource({ emptyDelayMs = 0 } = {}) {
  return `
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const userDataDir = ${userDataDirExpression()};
const activePort = path.join(userDataDir, 'DevToolsActivePort');
const server = http.createServer((request, response) => {
  if (request.url === '/json/version') {
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ Browser: 'Fake Chrome CDP 151.0', webSocketDebuggerUrl: 'ws://127.0.0.1/fake' }));
    return;
  }
  response.statusCode = 404;
  response.end();
});
server.listen(0, '127.0.0.1', () => {
  fs.writeFileSync(activePort, '');
  setTimeout(() => fs.writeFileSync(activePort, String(server.address().port) + '\\n/devtools/browser/fake'), ${emptyDelayMs});
});
process.on('SIGTERM', () => server.close(() => process.exit(0)));
setInterval(() => {}, 1000);
`;
}

test('reports an immediate Chrome exit with its stderr and exit code', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-chrome-exit-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const binary = makeFakeChrome(directory, 'chrome-exits', `
console.error('controlled startup failure');
process.exit(23);
`);
  await assert.rejects(
    launchChrome({ candidates: [binary], timeoutMs: 500 }),
    (error) => error.message.includes(`binary: ${binary}`)
      && error.message.includes('exitCode: 23')
      && error.message.includes('controlled startup failure')
  );
});

test('falls back after the first Chrome candidate fails', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-chrome-fallback-'));
  const failing = makeFakeChrome(directory, 'chrome-fails', `console.error('first candidate failed'); process.exit(23);`);
  const working = makeFakeChrome(directory, 'chrome-works', validCdpSource());
  let launched;
  t.after(async () => {
    if (launched) await cleanupChrome(launched);
    fs.rmSync(directory, { recursive: true, force: true });
  });
  launched = await launchChrome({ candidates: [failing, working], timeoutMs: 1000 });
  assert.equal(launched.binary, working);
  assert.equal(launched.browserVersion, 'Fake Chrome CDP 151.0');
  assert.equal(launched.commandVersion, 'Fake Chrome 151.0');
  assert.equal(launched.diagnostics.length, 1);
  assert.match(launched.diagnostics[0], /first candidate failed/);
});

test('waits for an empty DevToolsActivePort file to be completed', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-chrome-partial-port-'));
  const binary = makeFakeChrome(directory, 'chrome-delayed-port', validCdpSource({ emptyDelayMs: 150 }));
  let launched;
  t.after(async () => {
    if (launched) await cleanupChrome(launched);
    fs.rmSync(directory, { recursive: true, force: true });
  });
  launched = await launchChrome({ candidates: [binary], timeoutMs: 1000 });
  assert.ok(launched.port > 0 && launched.port <= 65535);
});

test('never treats an invalid DevToolsActivePort as ready', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-chrome-invalid-port-'));
  const marker = path.join(directory, 'terminated');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const binary = makeFakeChrome(directory, 'chrome-invalid-port', `
const fs = require('node:fs');
const path = require('node:path');
const userDataDir = ${userDataDirExpression()};
fs.writeFileSync(path.join(userDataDir, 'DevToolsActivePort'), '70000\\n');
process.on('SIGTERM', () => { fs.writeFileSync(${JSON.stringify(marker)}, 'yes'); process.exit(0); });
setInterval(() => {}, 1000);
`);
  await assert.rejects(
    launchChrome({ candidates: [binary], timeoutMs: 250 }),
    /DevToolsActivePort contains an out-of-range port: 70000/
  );
  assert.equal(fs.readFileSync(marker, 'utf8'), 'yes');
});

test('times out and terminates Chrome when DevToolsActivePort never appears', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'fake-chrome-no-cdp-'));
  const marker = path.join(directory, 'terminated');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const binary = makeFakeChrome(directory, 'chrome-no-cdp', `
const fs = require('node:fs');
process.on('SIGTERM', () => { fs.writeFileSync(${JSON.stringify(marker)}, 'yes'); process.exit(0); });
setInterval(() => {}, 1000);
`);
  await assert.rejects(
    launchChrome({ candidates: [binary], timeoutMs: 250 }),
    /DevToolsActivePort was not created/
  );
  assert.equal(fs.readFileSync(marker, 'utf8'), 'yes');
});
