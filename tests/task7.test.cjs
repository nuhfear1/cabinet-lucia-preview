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

test('production backend is activated with the Scalingo HTTPS URL', () => {
  const sandbox = runScript('backend-config.js');
  assert.equal(sandbox.window.CABINET_LUCIA_BACKEND.enabled, true);
  assert.equal(sandbox.window.CABINET_LUCIA_BACKEND.environment, 'production');
  assert.equal(sandbox.window.CABINET_LUCIA_BACKEND.baseUrl, 'https://cabinet-lucia-medical-platform.osc-fr1.scalingo.io');
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

test('assistant uses the canonical endpoint without credentials or forbidden CORS headers', async () => {
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
  assert.equal(request.options.headers['Cache-Control'], undefined);
  assert.deepEqual(JSON.parse(request.options.body), { question: 'Question pratique' });
});

test('public config uses the canonical GET endpoint', async () => {
  let request;
  const sandbox = runScript('public-api.js', {
    window: { CABINET_LUCIA_BACKEND: { enabled: true, baseUrl: 'https://backend.example.test', timeoutMs: 1000 } },
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ profile: null, rules: [] }) };
    }
  });
  await sandbox.window.CabinetLuciaApi.getPublicConfig();
  assert.equal(request.url, 'https://backend.example.test/api/public/config');
  assert.equal(request.options.method, 'GET');
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

test('booking validates trimmed first and last names against the backend minimum', () => {
  const source = fs.readFileSync(path.join(root, 'booking.js'), 'utf8');
  assert.match(source, /const firstName = form\.firstName\.value\.trim\(\);/);
  assert.match(source, /firstName && firstName\.length < 2/);
  assert.match(source, /Le prénom doit contenir au moins deux caractères\./);
  assert.match(source, /const lastName = form\.lastName\.value\.trim\(\);/);
  assert.match(source, /lastName && lastName\.length < 2/);
  assert.match(source, /Le nom doit contenir au moins deux caractères\./);
});

test('booking payload remains the canonical trimmed API contract', () => {
  const source = fs.readFileSync(path.join(root, 'booking.js'), 'utf8');
  for (const property of ['firstName', 'lastName', 'phone', 'email']) {
    assert.match(source, new RegExp(`${property}: form\\.${property}\\.value\\.trim\\(\\)`));
  }
  for (const property of ['reason', 'location', 'preferredAt', 'consent']) {
    assert.match(source, new RegExp(`\\b${property}:`));
  }
});

test('patient space exposes only local resources and keeps the portal hidden', () => {
  const html = fs.readFileSync(path.join(root, 'espace-patient.html'), 'utf8');
  for (const label of ['Préparer ma consultation', 'Comprendre l’ECG', 'Préparer une échographie', 'Suivre ma tension', 'Conseils de prévention', 'Comprendre son traitement', 'Trouver les cabinets', 'Demander un rendez-vous']) assert.match(html, new RegExp(label));
  assert.match(html, /id="patient-portal-link" href="" hidden/);
});

test('integration scripts load sequentially before consumers', () => {
  const source = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const config = source.indexOf("'backend-config.js'");
  const client = source.indexOf("'public-api.js'");
  const publicConfig = source.indexOf("'public-config.js'");
  const assistant = source.indexOf("'assistant.js'");
  const booking = source.indexOf("'booking.js'");
  assert.match(source, /for \(const src of ordered\) await load\(src\)/);
  assert.ok(config >= 0 && client > config && publicConfig > client && assistant > publicConfig && booking > publicConfig);
});

test('assistant client integration is fail-safe and cache versions stay aligned', () => {
  const assistant = fs.readFileSync(path.join(root, 'assistant.js'), 'utf8');
  assert.match(assistant, /typeof client\.getConfig !== 'function'/);
  assert.match(assistant, /typeof client\.askAssistant !== 'function'/);
  assert.match(assistant, /Promise\.race/);
  assert.ok(assistant.indexOf('try {') < assistant.indexOf('window.CabinetLuciaApi'));
  assert.doesNotMatch(assistant, /append\('assistant'/);
  assert.match(assistant, /append\('bot'/);

  const recipe = fs.readFileSync(path.join(root, 'scripts/technical-recipe.cjs'), 'utf8');
  assert.doesNotMatch(recipe, /\.assistant-message\.assistant/);
  assert.match(recipe, /\.assistant-message\.bot/);
  for (const visibilityCheck of ['displayVisible', 'visibilityVisible', 'opacityVisible', 'positionInFlow', 'renderedSize']) {
    assert.match(recipe, new RegExp(visibilityCheck));
  }

  const version = '20260820-assistant-live';
  assert.match(fs.readFileSync(path.join(root, 'app.js'), 'utf8'), new RegExp(`const version = '${version}'`));
  for (const filename of fs.readdirSync(root).filter((file) => file.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, filename), 'utf8');
    if (/<script[^>]+src="app\.js(?:\?[^\"]*)?"/.test(html)) {
      assert.match(html, new RegExp(`app\\.js\\?v=${version}`), `${filename} must load the current app.js version`);
    }
  }
});

test('public config hydrator consumes backend profile and rules', () => {
  const source = fs.readFileSync(path.join(root, 'public-config.js'), 'utf8');
  assert.match(source, /client\.getPublicConfig\(\)/);
  assert.match(source, /CABINET_LUCIA_PUBLIC_PROFILE/);
  assert.match(source, /CABINET_LUCIA_PUBLIC_RULES/);
});
