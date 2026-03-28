const https=require('https'), url=require('url'), fs=require('fs');
const C=JSON.parse(fs.readFileSync('./config/graph.json','utf-8'));
const TOKEN='./config/graph_token.json';
const STATE='./config/current_state.json';
const hp=(h,p,b)=>new Promise((rs,rj)=>{const r=https.request({hostname:h,path:p,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(b)}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{rs(JSON.parse(d))}catch{rs(d)}})})  ;r.on('error',rj);r.write(b);r.end();});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function main() {
  // Check existing token
  if(fs.existsSync(TOKEN)){try{const t=JSON.parse(fs.readFileSync(TOKEN,'utf-8'));if(t.access_token&&(!t.expires_at||Date.now()<t.expires_at-60000)){console.log('ALREADY_AUTH');return;}}catch{}}
  // Get device code
  const dc=await hp('login.microsoftonline.com','/'+C.tenantId+'/oauth2/v2.0/devicecode',new url.URLSearchParams({client_id:C.clientId,scope:'offline_access https://graph.microsoft.com/.default'}).toString());
  if(dc.error){console.log('ERR:'+dc.error);return;}
  const state={device_code:dc.device_code,expires_at:Date.now()+(dc.expires_in||300)*1000,interval:dc.interval||5};
  fs.writeFileSync(STATE,JSON.stringify(state));
  console.log('CODE:'+dc.user_code);
  console.log('URL: https://login.microsoftonline.com/device');
  // Poll
  while(Date.now()<state.expires_at){
    await sleep(state.interval*1000);
    const tr=await hp('login.microsoftonline.com','/'+C.tenantId+'/oauth2/v2.0/token',new url.URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:device_code',client_id:C.clientId,device_code:state.device_code}).toString());
    if(tr.access_token){
      const t={...tr,acquired_at:Date.now(),expires_at:Date.now()+(tr.expires_in||3600)*1000};
      fs.writeFileSync(TOKEN,JSON.stringify(t));
      console.log('TOKEN_SAVED');
      return;
    }
    if(tr.error==='expired_token'){console.log('EXPIRED');return;}
    if(tr.error&&tr.error!=='authorization_pending'&&tr.error!=='slow_down')console.log('ERR:'+tr.error);
  }
  console.log('TIMED_OUT');
}
main().catch(e=>console.log('FATAL:'+e.message));
