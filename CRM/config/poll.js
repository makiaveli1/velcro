const https=require('https'), url=require('url'), fs=require('fs');
const C=JSON.parse(fs.readFileSync('./config/graph.json','utf-8'));
const TOKEN='./config/graph_token.json';
const STATE='./config/current_state.json';
const RESULT='./config/poll_result.txt';
const LOG='/tmp/poll2.log';
const hp=(h,p,b)=>new Promise((rs,rj)=>{const r=https.request({hostname:h,path:p,method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Content-Length':Buffer.byteLength(b)}},res=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{rs(JSON.parse(d))}catch{rs(d)}})})  ;r.on('error',rj);r.write(b);r.end();});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=(m)=>{fs.appendFileSync(LOG,m+'\n');};
const state=JSON.parse(fs.readFileSync(STATE,'utf-8'));
// expires_at is stored in seconds; convert to ms for comparison with Date.now()
const expiresMs=state.expires_at*1000;
log('Poll started. State expires: '+new Date(expiresMs).toISOString()+', now: '+new Date().toISOString());
async function poll(){
  let count=0;
  while(Date.now()<expiresMs){
    await sleep(state.interval*1000);
    count++;
    try {
      const params=new url.URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:device_code',client_id:C.clientId,device_code:state.device_code});
      const body=params.toString();
      const tr=await hp('login.microsoftonline.com','/'+C.tenantId+'/oauth2/v2.0/token',body);
      log('Poll #'+count+': error='+tr.error+', has_token='+!!tr.access_token);
      if(tr.access_token){
        const t={...tr,acquired_at:Date.now(),expires_at:Date.now()+(tr.expires_in||3600)*1000};
        fs.writeFileSync(TOKEN,JSON.stringify(t));
        fs.writeFileSync(RESULT,'TOKEN SAVED');
        log('TOKEN SAVED!');
        return;
      }
      if(tr.error==='expired_token'){fs.writeFileSync(RESULT,'EXPIRED');log('EXPIRED!');return;}
    } catch(e){
      log('Poll #'+count+' exception: '+(e.message||String(e)));
    }
  }
  fs.writeFileSync(RESULT,'TIMED OUT');
  log('TIMED OUT!');
}
poll();
