#!/usr/bin/env node
// Full auth + Send As test — no PTY, no background, single process
const https = require('https'), url = require('url'), fs = require('fs'), path = require('path');
const C = JSON.parse(fs.readFileSync(path.join(__dirname, 'config', 'graph.json'), 'utf-8'));
const TOKEN = path.join(__dirname, 'config', 'graph_token.json');
const STATE = path.join(__dirname, 'config', 'current_state.json');

const hp = (h, p, b) => new Promise((rs, rj) => {
  const r = https.request({ hostname: h, path: p, method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(b) }},
    res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { rs(JSON.parse(d)) } catch { rs(d) } }) });
  r.on('error', rj); r.write(b); r.end();
});

const hpJson = (h, p, b, token) => new Promise((rs, rj) => {
  const d = JSON.stringify(b);
  const r = https.request({ hostname: h, path: p, method: 'POST',
    headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(d) }},
    res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { rs({ status: res.statusCode, body: JSON.parse(d) }) } catch { rs({ status: res.statusCode, body: d }) } }) });
  r.on('error', rj); r.write(d); r.end();
});

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // Check existing token
  if (fs.existsSync(TOKEN)) {
    try {
      const t = JSON.parse(fs.readFileSync(TOKEN, 'utf-8'));
      if (t.access_token && (!t.expires_at || Date.now() < t.expires_at - 60000)) {
        console.log('ALREADY_AUTH');
        await testSendAs(t.access_token);
        return;
      }
    } catch {}
  }

  // Get fresh device code
  console.log('Getting device code...');
  const dc = await hp('login.microsoftonline.com', '/' + C.tenantId + '/oauth2/v2.0/devicecode',
    new url.URLSearchParams({ client_id: C.clientId, scope: 'offline_access https://graph.microsoft.com/.default' }).toString());

  if (dc.error) { console.log('CODE_ERR:' + dc.error); return; }

  const expires_at = Date.now() + (dc.expires_in || 300) * 1000;
  fs.writeFileSync(STATE, JSON.stringify({ device_code: dc.device_code, expires_at, interval: dc.interval || 5 }));
  console.log('CODE:' + dc.user_code);
  console.log('URL:https://login.microsoftonline.com/device');

  // Poll
  while (Date.now() < expires_at) {
    await sleep((dc.interval || 5) * 1000);
    const tr = await hp('login.microsoftonline.com', '/' + C.tenantId + '/oauth2/v2.0/token',
      new url.URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:device_code', client_id: C.clientId, device_code: dc.device_code }).toString());

    if (tr.access_token) {
      const t = { ...tr, acquired_at: Date.now(), expires_at: Date.now() + (tr.expires_in || 3600) * 1000 };
      fs.writeFileSync(TOKEN, JSON.stringify(t));
      console.log('TOKEN_SAVED');
      await testSendAs(t.access_token);
      return;
    }
    if (tr.error === 'expired_token') { console.log('EXPIRED'); return; }
    if (tr.error && tr.error !== 'authorization_pending' && tr.error !== 'slow_down') {
      console.log('ERR:' + tr.error);
    }
  }
  console.log('TIMED_OUT');
}

async function testSendAs(accessToken) {
  console.log('Testing Send As...');
  const res = await hpJson('graph.microsoft.com', '/v1.0/me/sendMail', {
    message: {
      from: { address: 'studio@verdantia.it' },
      toRecipients: [{ emailAddress: { address: 'oluwagbemi@verdantia.it' } }],
      subject: 'Verdantia CRM — Send As Test',
      body: { contentType: 'Text', content: 'This is a test to verify the Send As API path from the CRM.\nIf you receive this, the full pipeline works.' }
    },
    saveToSentItems: false
  }, accessToken);

  console.log('Send As result:', res.status, res.body ? JSON.stringify(res.body).substring(0, 100) : '');
  if (res.status === 202) console.log('SEND_AS_WORKS');
  else console.log('SEND_AS_FAILED');
}

main().catch(e => console.log('FATAL:' + e.message));
