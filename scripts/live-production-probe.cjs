const { execFileSync } = require('node:child_process');
const fs = require('node:fs');

if (process.env.GITHUB_ACTIONS !== 'true') process.exit(0);

console.log('::group::Live production availability probe');
const url = 'https://cabinet-lucia-medical-platform.osc-fr1.scalingo.io/api/public/availability?reason=Suivi%20cardiologique&months=4';
const publicUrl = 'https://nuhfear1.github.io/cabinet-lucia-preview';

function curl(arguments_) {
  try {
    return execFileSync('curl', arguments_, { encoding: 'utf8' }).trim();
  } catch (error) {
    return `curl-error-${error.status ?? 'unknown'}`;
  }
}

const optionsStatus = curl([
  '-sS', '-D', '/tmp/options-headers.txt', '-o', '/tmp/options-body.txt', '-w', '%{http_code}',
  '-X', 'OPTIONS', '-H', 'Origin: https://nuhfear1.github.io',
  '-H', 'Access-Control-Request-Method: GET',
  '-H', 'Access-Control-Request-Headers: content-type,x-request-id', url
]);
const optionsHeaders = fs.existsSync('/tmp/options-headers.txt') ? fs.readFileSync('/tmp/options-headers.txt', 'utf8') : '';
console.log(`OPTIONS_HTTP_STATUS=${optionsStatus}`);
for (const name of ['access-control-allow-origin', 'access-control-allow-methods', 'access-control-allow-headers']) {
  const line = optionsHeaders.split(/\r?\n/).find((header) => header.toLowerCase().startsWith(`${name}:`));
  if (line) console.log(line);
}

const getStatus = curl([
  '-sS', '-D', '/tmp/get-headers.txt', '-o', '/tmp/get-body.txt', '-w', '%{http_code}',
  '-H', 'Origin: https://nuhfear1.github.io', '-H', 'Content-Type: application/json',
  '-H', 'X-Request-Id: github-actions-live-probe', url
]);
const getHeaders = fs.existsSync('/tmp/get-headers.txt') ? fs.readFileSync('/tmp/get-headers.txt', 'utf8') : '';
const getBody = fs.existsSync('/tmp/get-body.txt') ? fs.readFileSync('/tmp/get-body.txt', 'utf8') : '';
console.log(`GET_HTTP_STATUS=${getStatus}`);
for (const name of ['content-type', 'access-control-allow-origin', 'x-request-id']) {
  const line = getHeaders.split(/\r?\n/).find((header) => header.toLowerCase().startsWith(`${name}:`));
  if (line) console.log(line);
}
console.log('GET_BODY_BEGIN');
console.log(getBody);
console.log('GET_BODY_END');

let months = [];
try {
  const body = JSON.parse(getBody);
  months = Array.isArray(body.months) ? body.months : [];
} catch {}
const days = months.flatMap((month) => Array.isArray(month.days) ? month.days : []);
const slots = days.flatMap((day) => Array.isArray(day.slots) ? day.slots : []);
console.log(`LIVE_AVAILABILITY_MONTHS=${months.length}`);
console.log(`LIVE_AVAILABILITY_DAYS=${days.length}`);
console.log(`LIVE_AVAILABILITY_SLOTS=${slots.length}`);

const assets = {};
for (const asset of ['rendez-vous.html', 'app.js', 'backend-config.js', 'public-api.js', 'booking.js']) {
  assets[asset] = curl(['-sS', '--fail-with-body', `${publicUrl}/${asset}`]);
}
const appVersion = assets['app.js'].match(/20260914-booking-selection-fix/)?.[0] ?? 'missing';
console.log(`LIVE_PUBLIC_APP_VERSION=${appVersion}`);
console.log(`LIVE_PUBLIC_BACKEND_URL_PRESENT=${assets['backend-config.js'].includes('https://cabinet-lucia-medical-platform.osc-fr1.scalingo.io') ? 'yes' : 'no'}`);
console.log(`LIVE_PUBLIC_AVAILABILITY_CLIENT=${assets['public-api.js'].includes('/api/public/availability') ? 'yes' : 'no'}`);
console.log(`LIVE_PUBLIC_BOOKING_JS_CURRENT=${assets['booking.js'].includes('getAvailability') ? 'yes' : 'no'}`);
console.log('::endgroup::');
