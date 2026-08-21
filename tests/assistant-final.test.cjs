const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const assistant = fs.readFileSync(path.resolve(__dirname, '..', 'assistant.js'), 'utf8');

test('assistant removes paired bold markdown only from bot output while keeping DOM output text-only', () => {
  assert.match(assistant, /const normalizeAssistantText = \(value\) => String\(value\)\.replace\(\/\\\*\\\*\(\?=\\S\)\(\[\\s\\S\]\*\?\\S\)\\\*\\\*\/g, '\$1'\);/);
  assert.match(assistant, /message\.textContent = role === 'bot' \? normalizeAssistantText\(content\) : content;/);
  assert.match(assistant, /append\('user', question\);/);
  assert.doesNotMatch(assistant, /\.innerHTML\s*=/);
  assert.doesNotMatch(assistant, /insertAdjacentHTML/);
});

test('assistant keeps provider fallback and timeout guards in place', () => {
  assert.match(assistant, /if \(!client \|\| typeof client\.getConfig !== 'function' \|\| typeof client\.askAssistant !== 'function'\) return fallback\(\);/);
  assert.match(assistant, /Promise\.race/);
  assert.match(assistant, /Assistant timeout/);
  assert.match(assistant, /catch \{\n\s+fallback\(\);/);
});

test('assistant accepts only the four public response statuses', () => {
  for (const status of ['answer', 'unknown', 'medical_refusal', 'emergency']) assert.match(assistant, new RegExp(`'${status}'`));
  assert.match(assistant, /data\.status === 'emergency'/);
});
