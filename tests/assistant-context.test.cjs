const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const contextPath = path.join(root, 'assistant-context.json');

test('the public assistant context is reproducibly generated from allowlisted HTML blocks', () => {
  execFileSync(process.execPath, ['scripts/generate-assistant-context.cjs'], { cwd: root });
  const first = fs.readFileSync(contextPath, 'utf8');
  execFileSync(process.execPath, ['scripts/generate-assistant-context.cjs'], { cwd: root });
  assert.equal(fs.readFileSync(contextPath, 'utf8'), first);
  const corpus = JSON.parse(first);
  assert.equal(corpus.version, 1);
  assert.equal(corpus.source, 'public-site');
  assert.ok(corpus.entries.length > 0);
  assert.ok(Buffer.byteLength(first) < 100_000, 'corpus should remain below 100 KB');
});

test('the corpus includes both confirmed cabinet addresses and routes', () => {
  const corpus = JSON.parse(fs.readFileSync(contextPath, 'utf8'));
  const text = corpus.entries.map((entry) => entry.text).join('\n');
  assert.match(text, /Place Tricolore — 88J3\+W89\nAv\. Sainte-Rose de Lima\n97115 Sainte-Rose, Guadeloupe/);
  assert.match(text, /4127 Route de Abdon Saman – Perrin\n97111 Morne-à-l’Eau/);
  assert.ok(corpus.entries.some((entry) => entry.links?.some((link) => link.startsWith('https://www.google.com/maps/'))));
});

test('every entry is safe, complete, unique and plain text', () => {
  const source = fs.readFileSync(contextPath, 'utf8');
  const corpus = JSON.parse(source);
  for (const marker of [/À RENSEIGNER/iu, /à confirmer/iu, /À valider/iu, /Validation médicale à confirmer/iu, /<\/?(?:script|style)\b/iu]) assert.doesNotMatch(source, marker);
  for (const entry of corpus.entries) {
    assert.ok(typeof entry.id === 'string' && entry.id.trim());
    assert.ok(typeof entry.page === 'string' && entry.page.endsWith('.html'));
    assert.ok(typeof entry.text === 'string' && entry.text.trim());
    assert.doesNotMatch(entry.text, /<[^>]+>/);
  }
  assert.equal(new Set(corpus.entries.map((entry) => entry.id)).size, corpus.entries.length);
  assert.equal(new Set(corpus.entries.map((entry) => `${entry.page}\0${entry.text}`)).size, corpus.entries.length);
});
