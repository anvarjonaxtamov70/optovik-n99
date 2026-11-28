// Server-only signing primitive. Never expose as a generic UID-to-token HTTP service.
const PROJECT='optovik-n99-staging';
const AUD='https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const fail=()=>{throw Object.assign(new Error('custom-token-unavailable'),{status:503});};
const enc=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const part=v=>b64(enc.encode(JSON.stringify(v)));
export async function signTelegramCustomToken(env,authorization,clock=Date.now){
 // A successful, committed core result is required. Call only after checking target role and active Firebase user.
 if(env?.FIREBASE_PROJECT_ID!==PROJECT||env.N99_DATASET!=='synthetic-only'||env.N99_FIRESTORE_CANDIDATE!=='enabled'||env.N99_TELEGRAM_AUTH!=='enabled'||!['authorized','bound'].includes(authorization?.status)||typeof authorization.uid!=='string'||!/^[-_A-Za-z0-9]{1,100}$/.test(authorization.uid))fail();
 try{
  const a=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  if(a.project_id!==PROJECT||typeof a.client_email!=='string'||!a.client_email.endsWith('@'+PROJECT+'.iam.gserviceaccount.com')||typeof a.private_key!=='string')fail();
  const iat=Math.floor(clock()/1000);
  if(!Number.isSafeInteger(iat)||iat<=0)fail();
  const unsigned=part({alg:'RS256',typ:'JWT'})+'.'+part({iss:a.client_email,sub:a.client_email,aud:AUD,iat,exp:iat+120,uid:authorization.uid,claims:{n99_telegram:true}});
  const pem=a.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
  const key=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  return unsigned+'.'+b64(new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,enc.encode(unsigned))));
 }catch{fail();}
}
