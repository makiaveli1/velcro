#!/usr/bin/env node
// Get device code + write to file, then poll separately
const https = require('https'), url = require('url'), fs = require('fs'), path = require('path');
const CONFIG = JSON.parse(fs.readFileSync(path.join(__dirname,'..','config','graph.json'),'utf-8'));
const TOKEN = path.join(__dirname,'..','config','graph_token.json');
const STATE = path.join(__dirname,'..','config','auth_state.json');
const CODE_FILE = path.join(__dirname,'..','config','current_code.txt');
const LOG = '/tmp/token.log';

const hp = (h,po,b) => new Promise((rs,rj)=>{
  const req = https.request({hostname:h,path:po,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(b)}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{rs(JSON.parse(d))}catch{rs(d)}})});
  req.on('error',rj);req.write(b);req.end();
});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=m=>{const ts=new Date().toISOString().replace('T',' ').substring(0,19);fs.appendFileSync(LOG,`[${ts}] ${m}\n`);};

// Already have token?
if(fs.existsSync(TOKEN)){try{const t=JSON.parse(fs.readFileSync(TOKEN,'utf-8'));if(t.access_token&&(!t.expires_at||Date.now()<t.expires_at-60000)){console.log('ALREADY_AUTH');log('Already authenticated');process.exit(0);}}catch{}}

// Get fresh device code
log('Getting device code...');
const dcP=new url.URLSearchParams({client_id:CONFIG.clientId,scope:'offline_access https://graph.microsoft.com/.default'});
hp('login.microsoftonline.com','/'+CONFIG.tenantId+'/oauth2/v2.0/devicecode',dcP.toString()).then(dc=>{
  if(dc.error){console.log('ERROR:'+dc.error);log('Error:'+dc.error);process.exit(1);}
  const state={device_code:dc.device_code,user_code:dc.user_code,expires_at:Date.now()+(dc.expires_in||300)*1000,interval:dc.interval||5};
  fs.writeFileSync(STATE,JSON.stringify(state));
  fs.writeFileSync(CODE_FILE,dc.user_code); // Write code to file for easy reading
  console.log('CODE:'+dc.user_code);
  log('Code: '+dc.user_code+' expires '+new Date(state.expires_at).toLocaleString());
  // Poll
  let lastErr='';
  const poll=async()=>{
    while(Date.now()<state.expires_at){
      await sleep(state.interval*1000);
      const tp=new url.URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:device_code',client_id:CONFIG.clientId,device_code:state.device_code});
      const tr=await hp('login.microsoftonline.com','/'+CONFIG.tenantId+'/oauth2/v2.0/token',tp.toString());
      if(tr.access_token){
        const token={...tr,acquired_at:Date.now(),expires_at:Date.now()+(tr.expires_in||3600)*1000};
        fs.writeFileSync(TOKEN,JSON.stringify(token));
        if(fs.existsSync(STATE))fs.unlinkSync(STATE);
        fs.writeFileSync(CODE_FILE,'TOKEN_SAVED');
        console.log('TOKEN_SAVED');
        log('Token saved! Expires: '+new Date(token.expires_at).toLocaleString());
        process.exit(0);
      }
      if(tr.error==='expired_token'){log('Expired');process.exit(1);}
      if(tr.error&&tr.error!=='authorization_pending'&&tr.error!=='slow_down'){lastErr=tr.error;log('Err: '+tr.error);}
    }
    log('Timed out');
  };
  poll();
}).catch(e=>{log('FATAL:'+e.message);process.exit(1)});
