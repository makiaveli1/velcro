const https=require('https'), fs=require('fs');
const token=JSON.parse(fs.readFileSync('./config/graph_token.json','utf-8'));
const post=(path,body)=>new Promise((rs,rj)=>{
  const d=JSON.stringify(body);
  const req=https.request({hostname:'graph.microsoft.com',path:'/v1.0'+path,method:'POST',headers:{'Authorization':'Bearer '+token.access_token,'Content-Type':'application/json','Content-Length':Buffer.byteLength(d)}},res=>{
    let d='';res.on('data',c=>d+=c);res.on('end',()=>{try{rs({status:res.statusCode,body:JSON.parse(d)})}catch{rs({status:res.statusCode,body:d})}});
  });
  req.on('error',rj);req.write(d);req.end();
});
post('/me/sendMail',{
  message:{
    from:{emailAddress:{address:'studio@verdantia.it'}},
    toRecipients:[{emailAddress:{address:'oluwagbemi@verdantia.it'}}],
    subject:'Verdantia CRM Send As Test',
    body:{contentType:'Text',content:'This is a test to verify the Send As path works from the CRM.'}
  },
  saveToSentItems:false
}).then(r=>{
  console.log('Send As result:', r.status, JSON.stringify(r.body).substring(0,300));
  if(r.status===202)console.log('SEND AS WORKS');
  else console.log('SEND AS FAILED');
}).catch(e=>console.log('Error:',e.message));
