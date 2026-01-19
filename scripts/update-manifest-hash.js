#!/usr/bin/env node

// For Manifest V3, we use 'wasm-unsafe-eval' instead of hashes,
// so this script is kept for documentation purposes.
// The static injected script (must match exactly what's in content-script.ts):

const crypto = require('crypto');

const scriptContent = `(function() { 
    if (typeof __doPostBack === 'function' && window.__nhBillLinkerEventTarget) {
      __doPostBack(window.__nhBillLinkerEventTarget, window.__nhBillLinkerEventArgument);
      delete window.__nhBillLinkerEventTarget;
      delete window.__nhBillLinkerEventArgument;
    }
  })();`;

// Calculate SHA256 hash for reference
const hash = crypto
  .createHash('sha256')
  .update(scriptContent)
  .digest('base64');

console.log(`Script hash (for reference): sha256-${hash}`);
console.log('Using wasm-unsafe-eval in manifest.json for Manifest V3 compatibility');


