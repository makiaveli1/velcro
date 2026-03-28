#!/usr/bin/env node
// Non-interactive device code + background polling
// Run: node scripts/graph_auth_bg.js
// This script: (1) gets device code, (2) prints URL+code to stdout + log, (3) polls until token saved

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, '..', 'config', 'graph.json');
const TOKEN_PATH  = path.join(__dirname, '..', 'config', 'graph_token.json');
const LOG_PATH    = '/tmp/graph_auth.log';

function log(msg) {
  const ts = new Date().toISOString();
  const line = `[${ts}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_PATH, line + '\n');
}

// Check if already authenticated
function checkExisting() {
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const t = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      if (t.access_token && (!t.expires_at || Date.now() < t.expires_at - 60000)) {
        return true;
      }
    } catch {}
  }
  return false;
}

async function main() {
  // Load config
  let config;
  try {
    config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    console.error('No graph.json config found.');
    process.exit(1);
  }

  // Check if already authenticated
  if (checkExisting()) {
    log('Already authenticated — token found and not expired.');
    process.exit(0);
  }

  log('Requesting device code...');

  // Get device code via HTTPS
  const https = require('https');
  const url = require('url');

  function httpsRequest(hostname, pathname, bodyStr) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname,
        path: pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      };
      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      });
      req.on('error', reject);
      req.write(bodyStr);
      req.end();
    });
  }

  // Step 1: get device code
  const dcParams = new url.URLSearchParams({
    client_id: config.clientId,
    scope: 'offline_access https://graph.microsoft.com/.default',
  });

  const dcRes = await httpsRequest(
    'login.microsoftonline.com',
    `/${config.tenantId}/oauth2/v2.0/devicecode`,
    dcParams.toString()
  );

  if (dcRes.status !== 200) {
    console.error('Device code error:', dcRes.body);
    process.exit(1);
  }

  const dc = dcRes.body;
  log(`Device code received. Code: ${dc.user_code}`);
  console.log('\n' + '='.repeat(60));
  console.log('GRAPH AUTHENTICATION REQUIRED');
  console.log('='.repeat(60));
  console.log(`\n  URL:   ${dc.verification_uri}`);
  console.log(`  Code:  ${dc.user_code}\n`);
  console.log('  → Open the URL in your browser and enter the code.');
  console.log('  → Sign in with the M365 user that has access to studio@verdantia.it');
  console.log('  → This script will poll until token is saved.\n');
  console.log('='.repeat(60) + '\n');

  // Step 2: poll for token
  const interval = (dc.interval || 5) * 1000;
  const startTime = Date.now();
  const expiresAt = startTime + (dc.expires_in || 300) * 1000;

  log(`Polling every ${interval/1000}s for token...`);
  console.log(`[Polling started — this script will keep running until token is saved or code expires]\n`);

  while (Date.now() < expiresAt) {
    await new Promise(r => setTimeout(r, interval));

    try {
      const tokenParams = new url.URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        client_id: config.clientId,
        device_code: dc.device_code,
      });

      const tokenRes = await httpsRequest(
        'login.microsoftonline.com',
        `/${config.tenantId}/oauth2/v2.0/token`,
        tokenParams.toString()
      );

      if (tokenRes.status === 200) {
        const token = {
          ...tokenRes.body,
          acquired_at: Date.now(),
          expires_at: Date.now() + tokenRes.body.expires_in * 1000,
        };
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
        log('TOKEN SAVED! Authentication successful.');
        console.log(`\n✅ Token acquired and saved to ${TOKEN_PATH}`);
        console.log(`   Expires in: ${Math.round((token.expires_at - Date.now()) / 60000)} minutes`);
        process.exit(0);
      }

      if (tokenRes.body.error === 'authorization_pending') {
        // Still waiting
      } else if (tokenRes.body.error === 'slow_down') {
        log('slow_down received — increasing poll interval');
      } else {
        log(`Token error: ${JSON.stringify(tokenRes.body)}`);
        console.error('Error:', tokenRes.body);
        process.exit(1);
      }
    } catch (err) {
      log(`Poll error: ${err.message}`);
    }

    // Check for manual token file creation as fallback
    if (checkExisting()) {
      log('Token found (written by another process).');
      process.exit(0);
    }
  }

  log('Device code expired. Please re-run.');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
