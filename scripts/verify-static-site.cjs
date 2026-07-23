const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const required = [
  'index.html',
  'rendez-vous.html',
  'site.js',
  'app.js',
  'backend-config.js',
  'public-api.js',
  'assistant.js',
  'booking.js',
  'TASK7_DEPLOYMENT.md',
  'TASK7_ROLLBACK.md'
];

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Fichier obligatoire manquant: ${file}`);
}

const config = fs.readFileSync(path.join(root, 'backend-config.js'), 'utf8');
if (!/enabled:\s*configured\.enabled\s*===\s*true/.test(config)) throw new Error('Le feature flag contrôlé est absent.');
if (!/\^https:/.test(config)) throw new Error('L’activation HTTPS stricte est absente.');

const api = fs.readFileSync(path.join(root, 'public-api.js'), 'utf8');
for (const endpoint of ['/api/public/assistant', '/api/public/appointment-requests']) {
  if (!api.includes(endpoint)) throw new Error(`Endpoint public manquant: ${endpoint}`);
}
if (!api.includes("credentials: 'omit'")) throw new Error('Les requêtes publiques ne doivent envoyer aucun cookie privé.');
if (!api.includes("'Idempotency-Key'")) throw new Error('La clé d’idempotence rendez-vous est absente.');

const booking = fs.readFileSync(path.join(root, 'booking.js'), 'utf8');
for (const field of ['firstName', 'lastName', 'phone', 'email', 'reason', 'location', 'preferredAt', 'consent']) {
  if (!booking.includes(field)) throw new Error(`Champ de contrat rendez-vous absent: ${field}`);
}

console.log('Task 7 static verification passed.');
