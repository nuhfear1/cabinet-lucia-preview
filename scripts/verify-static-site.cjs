const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const required = [
  'index.html',
  'rendez-vous.html',
  'espace-patient.html',
  'site.js',
  'app.js',
  'backend-config.js',
  'public-api.js',
  'public-config.js',
  'assistant.js',
  'assistant-context.json',
  'booking.js',
  'patient-portal.js',
  'FINAL_CONNECTION_CHECKLIST.md',
  'TASK7_DEPLOYMENT.md',
  'TASK7_ROLLBACK.md'
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Fichier obligatoire manquant: ${file}`);
}

const config = fs.readFileSync(path.join(root, 'backend-config.js'), 'utf8');
if (!/enabled:\s*configured\.enabled\s*===\s*true/.test(config)) throw new Error('Le feature flag contrôlé est absent.');
if (!config.includes("environment === 'production'") || !config.includes("environment === 'staging'")) throw new Error('La validation stricte de l’environnement est absente.');
for (const forbidden of ['localhost', 'example', '.invalid']) {
  if (!config.includes(forbidden)) throw new Error(`Le refus de ${forbidden} est absent.`);
}

const api = fs.readFileSync(path.join(root, 'public-api.js'), 'utf8');
for (const endpoint of ['/api/public/config', '/api/public/assistant', '/api/public/appointment-requests']) {
  if (!api.includes(endpoint)) throw new Error(`Endpoint public manquant: ${endpoint}`);
}
if (!api.includes("credentials: 'omit'")) throw new Error('Les requêtes publiques ne doivent envoyer aucun cookie privé.');
if (!api.includes("cache: 'no-store'")) throw new Error('Le cache navigateur des requêtes publiques doit être interdit.');
if (api.includes("'Cache-Control': 'no-store'")) throw new Error('L’en-tête Cache-Control de requête est interdit par le contrat CORS.');
if (!api.includes("'Idempotency-Key'")) throw new Error('La clé d’idempotence rendez-vous est absente.');

const booking = fs.readFileSync(path.join(root, 'booking.js'), 'utf8');
for (const field of ['firstName', 'lastName', 'phone', 'email', 'reason', 'location', 'preferredAt', 'consent']) {
  if (!booking.includes(field)) throw new Error(`Champ de contrat rendez-vous absent: ${field}`);
}

console.log('Task 7 static verification passed.');
