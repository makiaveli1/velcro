#!/usr/bin/env node
// Long-running token watcher — survives session timeouts
// Checks every 10s for up to 20 minutes
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'config', 'graph_token.json');
const STATE_PATH  = path.join(__dirname, '..', 'config', 'auth_state.json');
const LOG_PATH   = '/tmp/token_watcher.log';

function log(msg) {
  const ts = new Date().toISOString().replace('T',' ').substring(0,19);
  fs.appendFileSync(LOG_PATH, `[${ts}] ${msg}\n`);
  console.error(`[${ts}] ${msg}`);
}

// Check if already have valid token
if (fs.existsSync(TOKEN_PATH)) {
  try {
    const t = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    if (t.access_token && (!t.expires_at || Date.now() < t.expires_at - 60000)) {
      log('ALREADY_HAVE_TOKEN');
      console.log('ALREADY_HAVE_TOKEN');
      process.exit(0);
    }
  } catch {}
}

// Load auth state
let state;
if (fs.existsSync(STATE_PATH)) {
  try {
    state = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
    if (state.expires_at && Date.now() < state.expires_at) {
      log(`Resume: device code ${state.user_code} still valid until ${new Date(state.expires_at).toISOString()}`);
      log('URL: https://login.microsoftonline.com/device');
      log(`CODE: ${state.user_code}`);
      console.log('RESUME_CODE:' + state.user_code);
    } else {
      log('State expired or invalid — needs fresh code');
      state = null;
    }
  } catch { state = null; }
}

if (!state) {
  log('No active state — write DONE to this file to signal completion:');
  log(TOKEN_PATH);
  log('Or: touch /tmp/auth_complete_flag');
  console.log('NO_STATE');
}

// Poll for token
const MAX_WAIT = 20 * 60 * 1000; // 20 minutes
const CHECK_INTERVAL = 10000; // 10s
const start = Date.now();

log(`Polling every ${CHECK_INTERVAL/1000}s until ${new Date(start + MAX_WAIT).toISOString()}`);
console.error('POLLING_STARTED');

while (Date.now() - start < MAX_WAIT) {
  await new Promise(r => setTimeout(r, CHECK_INTERVAL));

  if (fs.existsSync(TOKEN_PATH)) {
    try {
      const t = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
      if (t.access_token) {
        log(`TOKEN_FOUND at ${new Date().toISOString()}`);
        log(`Expires: ${t.expires_at ? new Date(t.expires_at).toISOString() : 'unknown'}`);
        log(`Scope: ${t.scope}`);
        console.log('TOKEN_FOUND');
        process.exit(0);
      }
    } catch {}
  }

  if (fs.existsSync('/tmp/auth_complete_flag')) {
    log('Flag file detected — checking token...');
    fs.unlinkSync('/tmp/auth_complete_flag');
  }
}

log('Timed out after 20 minutes');
console.log('TIMED_OUT');
