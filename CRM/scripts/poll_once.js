#!/usr/bin/env node
// Single-purpose: get device code, print it, poll until token saved
const https = require('https'), url = require('url'), fs = require('fs'), path = require('path');
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','graph.json'),'utf-8'));
const TOKEN = path.join(__dirname,'..','config','graph_token.json');
const STATE = path.join(__dirname,'..','config','auth_state.json');
const LOG = '/tmp/token_poll.log';

const hp = (h,p,b) => new Promise((rs,rj) => {
  const req = https.request({hostname:h,path:p,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(b)}},res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{rs(JSON.parse(d)) }catch{rs(d)} }); });
  req.on('error',rj); req.write(b); req.end();
});
const sleep = ms => new Promise(r => setTimeout(r,ms));
const log = m => { const ts = new Date().toISOString().replace('T',' ').substring(0,19); fs.appendFileSync(LOG,`[${ts}] ${m}\n`); };

async function main() {
  const now = Date.now();
  if (fs.existsSync(TOKEN)) { try { const t = JSON.parse(fs.readFileSync(TOKEN,'utf-8')); if (t.access_token&&(!t.expires_at||now<t.expires_at-60000)){log('ALREADY_AUTH');process.exit(0);} }catch{} }
  const dcP = new url.URLSearchParams({client_id:CONFIG.clientId,scope:'offline_access https://graph.microsoft.com/.default'});
  const dc = await hp('login.microsoftonline.com','/'+CONFIG.tenantId+'/oauth2/v2.0/devicecode',dcP.toString());
  if (dc.error) { console.log('CODE_ERROR:'+dc.error);process.exit(1); }
  const state = {device_code:dc.device_code,user_code:dc.user_code,expires_at:now+(dc.expires_in||300)*1000,interval:dc.interval||5};
  fs.writeFileSync(STATE,JSON.stringify(state));
  console.log('CODE:'+state.user_code);
  log('Code generated: '+state.user_code);
  while (Date.now()<state.expires_at) {
    await sleep(state.interval*1000);
    const tp = new url.URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:device_code',client_id:CONFIG.clientId,device_code:state.device_code});
    const tr = await hp('login.microsoftonline.com','/'+CONFIG.tenantId+'/oauth2/v2.0/token',tp.toString());
    if (tr.access_token) {
      const token = {...tr,acquired_at:Date.now(),expires_at:Date.now()+(tr.expires_in||3600)*1000};
      fs.writeFileSync(TOKEN,JSON.stringify(token));
      if(fs.existsSync(STATE)) fs.unlinkSync(STATE);
      log('TOKEN_SAVED at '+new Date().toISOString());
      console.log('TOKEN_SAVED');
      process.exit(0);
    }
    if (tr.error==='expired_token') { log('EXPIRED'); process.exit(1); }
    if (tr.error&&tr.error!=='authorization_pending'&&tr.error!=='slow_down') log('ERR:'+tr.error);
  }
  log('TIMED_OUT');
}
main().catch(e=>{log('FATAL:'+e.message);process.exit(1);});
