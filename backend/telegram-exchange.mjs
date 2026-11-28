// Disabled staging transport. No client-provided UID is accepted for token issuance.
import {boundedJson,remainingBudget} from './staging-worker.mjs';
import {telegramTransportReady} from './telegram-webhook.mjs';
const routes=new Set(['/v1/telegram/begin','/v1/telegram/finish']);
export const isTelegramExchange=path=>routes.has(path);
export const telegramExchangeReady=env=>telegramTransportReady(env)&&env.N99_TELEGRAM_EXCHANGE==='enabled';
const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const uidOk=v=>typeof v==='string'&&/^[-_A-Za-z0-9]{1,100}$/.test(v);
const errors=new Set(['invalid-telegram-request','telegram-rate','telegram-already-linked','unauthenticated','forbidden']);
const json=(value,status=200)=>Response.json(value,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-N99-Backend':'firestore-candidate'}});
export async function lookupTelegramTarget({uid,access,deadline,fetcher=fetch,clock=Date.now}){
 if(!uidOk(uid)||typeof access!=='string'||!access)throw new Error('target-unavailable');
 const res=await fetcher('https://identitytoolkit.googleapis.com/v1/projects/optovik-n99-staging/accounts:lookup',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({localId:[uid]}),redirect:'error',signal:AbortSignal.timeout(remainingBudget(deadline,6000,clock()))});
 if(!res.ok)throw new Error('target-unavailable');
 const data=await res.json(),user=data?.users?.[0];
 // A deleted user must not be silently recreated by signInWithCustomToken.
 // An unverified email is not a safe second recovery provider.
 return user?.localId===uid&&user.disabled!==true&&(!user.email||user.emailVerified===true);
}
export function createTelegramExchange({authenticate,coreFor,checkTarget,sign,clock=Date.now}){
 return async (request,env)=>{
  const path=new URL(request.url).pathname;
  if(!isTelegramExchange(path))return json({error:'not-found'},404);
  if(!telegramExchangeReady(env))return json({error:'unavailable'},503);
  if(request.method!=='POST')return json({error:'invalid-telegram-request'},405);
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')??''))return json({error:'invalid-telegram-request'},415);
  const deadline=clock()+24000;
  try{
   const actor=await authenticate(request,env,deadline);
   if(!uidOk(actor?.uid))return json({error:'unauthenticated'},401);
   const b=await boundedJson(request,2048);
   if(!rec(b))return json({error:'invalid-telegram-request'},400);
   if(path.endsWith('/begin')){
    if(Object.keys(b).some(k=>!['phone','mode'].includes(k)))return json({error:'invalid-telegram-request'},400);
    const core=await coreFor(env,deadline);
    const result=await core.begin(actor,{phone:b.phone,mode:b.mode});
    return json({token:result.token,expiresIn:result.expiresIn});
   }
   if(Object.keys(b).some(k=>!['token','code'].includes(k)))return json({error:'invalid-telegram-request'},400);
   const core=await coreFor(env,deadline);
   const result=await core.finish(actor,{token:b.token,code:b.code});
   if(!['authorized','bound'].includes(result?.status))return json({status:['invalid','conflict','guest-history'].includes(result?.status)?result.status:'invalid'});
   if(!uidOk(result.uid)||(result.status==='bound'&&result.uid!==actor.uid))return json({error:'unavailable'},503);
   if(!await checkTarget(env,result.uid,deadline))return json({status:'conflict'});
   const customToken=await sign(env,result);
   return json({status:result.status,uid:result.uid,customToken});
  }catch(e){
   const status=Number.isInteger(e?.status)&&e.status>=400&&e.status<500?e.status:503;
   return json({error:status>=500?'unavailable':errors.has(e?.message)?e.message:'invalid-telegram-request'},status);
  }
 };
}
