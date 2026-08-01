const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');

function runScript(filename, overrides = {}) {
  const source = fs.readFileSync(path.join(root, filename), 'utf8');
  const sandbox = {
    console,
    setTimeout,
    clearTimeout,
    AbortController,
    Error,
    Date,
    Math,
    JSON,
    Object,
    Number,
    String,
    RegExp,
    URL,
    Promise,
    crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000001' },
    ...overrides
  };
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox.window || sandbox;
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename });
  return sandbox;
}

test('backend flag stays disabled by default', () => {
  const sandbox = runScript('backend-config.js');
  assert.equal(sandbox.window.CABINET_LUCIA_BACKEND.enabled, false);
  assert.equal(sandbox.window.CABINET_LUCIA_BACKEND.baseUrl, '');
});

test('backend flag rejects non-HTTPS activation', () => {
  const sandbox = runScript('backend-config.js', {
    window: { CABINET_LUCIA_BACKEND_CONFIG: { enabled: true, baseUrl: 'http://backend.example.test' } }
  });
  assert.equal(sandbox.window.CABINET_LUCIA_BACKEND.enabled, false);
});

test('backend activation requires a safe URL and an explicit environment', () => {
  for (const baseUrl of ['https://example.com', 'https://localhost', 'https://service.invalid']) {
    const sandbox = runScript('backend-config.js', {
      window: { CABINET_LUCIA_BACKEND_CONFIG: { enabled: true, baseUrl, environment: 'production' } }
    });
    assert.equal(sandbox.window.CABINET_LUCIA_BACKEND.enabled, false);
    assert.equal(sandbox.window.CABINET_LUCIA_BACKEND.baseUrl, '');
  }
  const wrongEnvironment = runScript('backend-config.js', {
    window: { CABINET_LUCIA_BACKEND_CONFIG: { enabled: true, baseUrl: 'https://backend.cabinet-lucia.test', environment: 'connection-ready' } }
  });
  assert.equal(wrongEnvironment.window.CABINET_LUCIA_BACKEND.enabled, false);
});

test('rollback mode performs no network request', async () => {
  let calls = 0;
  const sandbox = runScript('public-api.js', {
    window: { CABINET_LUCIA_BACKEND: { enabled: false, baseUrl: '', timeoutMs: 1000 } },
    fetch: async () => { calls += 1; }
  });
  const response = await sandbox.window.CabinetLuciaApi.askAssistant('Où se trouve le cabinet ?');
  assert.deepEqual(JSON.parse(JSON.stringify(response)), { enabled: false, data: null });
  assert.equal(calls, 0);
});

test('assistant uses the canonical endpoint without credentials', async () => {
  let request;
  const sandbox = runScript('public-api.js', {
    window: { CABINET_LUCIA_BACKEND: { enabled: true, baseUrl: 'https://backend.example.test', timeoutMs: 1000 } },
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ status: 'answer', answer: 'Réponse', sources: [] }) };
    }
  });
  const response = await sandbox.window.CabinetLuciaApi.askAssistant('Question pratique');
  assert.equal(response.enabled, true);
  assert.equal(request.url, 'https://backend.example.test/api/public/assistant');
  assert.equal(request.options.credentials, 'omit');
  assert.equal(request.options.cache, 'no-store');
  assert.equal(request.options.headers['Cache-Control'], 'no-store');
  assert.deepEqual(JSON.parse(request.options.body), { question: 'Question pratique' });
});

test('appointment request sends the exact idempotency key and payload', async () => {
  let request;
  const sandbox = runScript('public-api.js', {
    window: { CABINET_LUCIA_BACKEND: { enabled: true, baseUrl: 'https://backend.example.test', timeoutMs: 1000 } },
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ ok: true, requestId: 'req-1', status: 'RECEIVED', replay: false }) };
    }
  });
  const payload = {
    firstName: 'Marie',
    lastName: 'Durand',
    phone: '0690000000',
    email: '',
    reason: 'Suivi cardiologique',
    location: 'MORNE_A_LEAU',
    preferredAt: '2026-08-10T13:00:00.000Z',
    consent: true
  };
  await sandbox.window.CabinetLuciaApi.submitAppointmentRequest(payload, 'stable-key');
  assert.equal(request.url, 'https://backend.example.test/api/public/appointment-requests');
  assert.equal(request.options.headers['Idempotency-Key'], 'stable-key');
  assert.deepEqual(JSON.parse(request.options.body), payload);
});

test('booking markup matches the final backend contract', () => {
  const html = fs.readFileSync(path.join(root, 'rendez-vous.html'), 'utf8');
  for (const field of ['firstName', 'lastName', 'phone', 'email', 'date', 'consent']) {
    assert.match(html, new RegExp(`name="${field}"`));
  }
  assert.match(html, /value="MORNE_A_LEAU"/);
  assert.match(html, /value="SAINTE_ROSE"/);
  assert.match(html, /type="checkbox" required/);
  assert.match(html, /name="website"/);
});

test('appointment success requires the complete canonical response', () => {
  const source = fs.readFileSync(path.join(root, 'booking.js'), 'utf8');
  assert.match(source, /response\.data\?\.ok !== true/);
  assert.match(source, /response\.data\.status !== 'RECEIVED'/);
  assert.match(source, /response\.data\.requestId[^\n]+trim/);
  assert.match(source, /Votre demande a bien été transmise au cabinet/);
});

test('patient space exposes only local resources and keeps the portal hidden', () => {
  const html = fs.readFileSync(path.join(root, 'espace-patient.html'), 'utf8');
  for (const label of ['Préparer ma consultation', 'Comprendre l’ECG', 'Préparer une échographie', 'Suivre ma tension', 'Conseils de prévention', 'Comprendre son traitement', 'Trouver les cabinets', 'Demander un rendez-vous']) assert.match(html, new RegExp(label));
  assert.match(html, /id="patient-portal-link" href="" hidden/);
});

test('integration scripts load before assistant and booking', () => {
  const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const config = source.indexOf("'backend-config.js'");
  const client = source.indexOf("'public-api.js'");
  const assistant = source.indexOf("'assistant.js'");
  const booking = source.indexOf("'booking.js'");
  assert.ok(config >= 0 && client > config && assistant > client && booking > client);
});
