const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('the doctor page and its shared navigation links are removed', () => {
  assert.equal(fs.existsSync(path.join(root, 'docteure.html')), false);

  const site = read('site.js');
  assert.doesNotMatch(site, /href=["']docteure\.html["']/);
  assert.doesNotMatch(site, />La docteure<\/a>/);
});

test('public pages contain no dead link to the removed doctor page', () => {
  const publicPages = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
  assert.ok(publicPages.length > 0);

  for (const page of publicPages) {
    assert.doesNotMatch(read(page), /href=["']docteure\.html["']/, page);
  }
});

test('assistant context and browser recipes omit the removed page', () => {
  const context = read('assistant-context.json');
  assert.doesNotMatch(context, /docteure\.html|doctor-identity/);
  assert.doesNotMatch(read('scripts/technical-recipe.cjs'), /docteure\.html/);
  assert.doesNotMatch(read('scripts/scroll-performance.cjs'), /docteure\.html/);
});

test('the remaining principal public pages still exist', () => {
  for (const page of ['index.html', 'consultations.html', 'prevention.html', 'cabinets.html', 'rendez-vous.html']) {
    assert.equal(fs.existsSync(path.join(root, page)), true, page);
  }
});
