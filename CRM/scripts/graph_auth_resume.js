#!/usr/bin/env node
/**
 * Resumable Graph Device Code Auth
 * - Gets a fresh device code
 * - Polls until token is saved
 * - If killed, re-running picks up from where it left off (state file)
 * - Device codes last 15 minutes — re-running within that window is safe
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

// Canonical path: ~/.openclaw/graph/ — shared between velcro CRM and signal-loom
const GRAPH_DIR   = path.join(process.env.HOME ?? '/home/likwid', '.openclaw', 'graph');
const CONFIG_PATH = path.join(GRAPH_DIR, 'graph.json');
const TOKEN_PATH  = path.join(GRAPH_DIR, 'graph_token.json');
const STATE_PATH = path.join(__dirname, '..', 'config', 'auth_state.json');
const LOG_PATH   = '/tmp/graph_auth_resume.log';

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const line = `[${ts}] ${msg}`;
  console.error(line); // stdout may be captured; use stderr for logs
  fs.appendFileSync(LOG_PATH, line + '\n');
}

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

function loadState() {
  if (!fs.existsSync(STATE_PATH)) return null;
  try { return JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')); } catch { return null; }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function httpPost(hostname, pathname, bodyStr) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname, path: pathname, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(bodyStr) }
    };
    const req = https.request(options, res => {
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

function tokenRequest(hostname, pathname, bodyStr) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname, path: pathname, method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(bodyStr) }
    };
    const req = https.request(options, res => {
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

async function main() {
  log('=== Starting resumable auth ===');

  // Check existing token first
  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const t = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      if (t.access_token && (!t.expires_at || Date.now() < t.expires_at - 60000)) {
        log('Token already valid — nothing to do.');
        console.log('ALREADY_AUTHENTICATED');
        return;
      }
    } catch {}
  }

  const config = loadConfig();
  const state = loadState();
  const now = Date.now();

  let dc;
  let device_code, user_code, verification_uri, interval, expires_in;

  if (state && state.device_code && state.expires_at && now < state.expires_at) {
    // Resume existing session
    log('Resuming previous session (device code still valid)');
    ({ device_code, user_code, verification_uri, interval, expires_in } = state);
    dc = state;
  } else {
    // Fresh device code
    log('Requesting fresh device code...');
    const params = new url.URLSearchParams({
      client_id: config.clientId,
      scope: 'offline_access https://graph.microsoft.com/.default',
    });

    const res = await httpPost(
      'login.microsoftonline.com',
      `/${config.tenantId}/oauth2/v2.0/devicecode`,
      params.toString()
    );

    if (res.status !== 200) {
      log(`Device code error: ${JSON.stringify(res.body)}`);
      process.exit(1);
    }

    dc = res.body;
    device_code = dc.device_code;
    user_code = dc.user_code;
    verification_uri = dc.verification_uri;
    interval = dc.interval || 5;
    expires_in = dc.expires_in || 300;

    // Save state
    saveState({
      device_code, user_code, verification_uri,
      interval, expires_in,
      expires_at: now + expires_in * 1000,
      saved_at: now,
    });

    log(`New device code: ${user_code}`);
  }

  // Print instructions (to stdout so user sees it)
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  Microsoft Graph — Authentication                        ║');
  console.log('╠══════════════════════════════════════════════════════════╣');
  console.log('║                                                           ║');
  console.log('║  1. Open this URL in your browser:                      ║');
  console.log(`║                                                           ║`);
  console.log(`║    ${String(verification_uri).substring(0, 46).padEnd(46)}║`);
  console.log('║                                                           ║');
  console.log('║  2. Enter this code:                                    ║');
  console.log(`║                                                           ║`);
  console.log(`║    ${String(user_code).padEnd(46)}║`);
  console.log('║                                                           ║');
  console.log('║  3. Sign in with the M365 user for studio@verdantia.it ║');
  console.log('║                                                           ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('CODE_GENERATED');
  console.log('Polling will begin automatically once you complete the login...');
  console.log('');

  // Poll
  const pollInterval = interval * 1000;
  const pollExpires = now + (expires_in * 1000);
  log(`Polling every ${pollInterval/1000}s until ${new Date(pollExpires).toISOString()}`);

  let lastError = '';
  while (Date.now() < pollExpires) {
    await new Promise(r => setTimeout(r, pollInterval));

    const params = new url.URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: config.clientId,
      device_code,
    });

    const res = await tokenRequest(
      'login.microsoftonline.com',
      `/${config.tenantId}/oauth2/v2.0/token`,
      params.toString()
    );

    if (res.status === 200) {
      const token = {
        ...res.body,
        acquired_at: Date.now(),
        expires_at: Date.now() + res.body.expires_in * 1000,
      };
      fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2));
      if (fs.existsSync(STATE_PATH)) fs.unlinkSync(STATE_PATH);
      log('TOKEN SAVED SUCCESSFULLY');
      console.log('');
      console.log('══════════════════════════════════════════════════════════');
      console.log('  ✅  AUTHENTICATION COMPLETE');
      console.log(`  Token saved to: ${TOKEN_PATH}`);
      console.log(`  Expires: ${new Date(token.expires_at).toLocaleString()}`);
      console.log('══════════════════════════════════════════════════════════');
      console.log('');
      return;
    }

    if (res.body?.error === 'authorization_pending') {
      lastError = 'waiting...';
    } else if (res.body?.error === 'slow_down') {
      lastError = 'slow_down — waiting...';
    } else {
      lastError = JSON.stringify(res.body?.error || res.body);
      log(`Token error: ${lastError}`);
      if (res.body?.error === 'expired_token') {
        console.error('Device code expired. Please re-run this script.');
        process.exit(1);
      }
    }

    // Log progress every 30s
    if (Date.now() % 30000 < pollInterval) {
      log(`Still polling... (last: ${lastError})`);
    }
  }

  log('Device code expired without successful auth. Please re-run.');
  process.exit(1);
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
