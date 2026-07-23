const fs = require('node:fs');
const originalRmSync = fs.rmSync.bind(fs);
fs.rmSync = function safeRmSync(target, options) {
  try {
    return originalRmSync(target, options);
  } catch (error) {
    if (error && error.code === 'ENOTEMPTY' && String(target).includes('cabinet-lucia-chrome-')) return;
    throw error;
  }
};
