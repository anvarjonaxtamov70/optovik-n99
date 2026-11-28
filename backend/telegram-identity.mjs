// Staging-only transactional authentication core. Not exposed by HTTP yet.
// All external identifiers are keyed hashes; challenge records are bounded in a single staging document.
// Verified actor metadata must come from Firebase server lookup, never the client body.
import {paths} from './firestore-orders.mjs';
export const CHALLENGE_MS=300000, COOLDOWN_MS=60000, MAX_ATTEMPTS=5, DAILY_CAP=100;
const DAY=86400000, statePath='n99Settings/telegramChallenges';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const ok=(value,message,status)=>{if(!value)fail(message,status);};
const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const hex=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uidOk=v=>typeof v==='string'&&/^[-_A-Za-z0-9]{1,100}$/.test(v);
const phoneOk=v=>typeof v==='string'&&/^\+998\d{9}$/.test(v);
const idOk=v=>Number.isSafeInteger(v)&&v>0;
const tokenOk=v=>typeof v==='string'&&/^[a-f0-9]{48}$/.test(v);
const normalizePhone=v=>typeof v==='string'&&/^\+?998\d{9}$/.test(v)?'+'+v.replace(/^\+/,''):null;
const uidPath=u=>'n99TelegramUsers/'+u;
const tgPath=h=>'n99TelegramAccounts/'+h;
const phonePath=h=>'n99TelegramPhones/'+h;
const same=(a,b)=>{if(!hex(a)||!hex(b))return false;let n=0;for(let i=0;i<64;i++)n|=a.charCodeAt(i)^b.charCodeAt(i);return n===0;};
function actorOk(actor,mode){return rec(actor)&&uidOk(actor.uid)&&(mode==='login'?actor.anonymous===true:mode==='bind'&&(actor.anonymous===true||actor.emailVerified===true));}
function readState(raw,now){
 const day=Math.floor(now/DAY);
 if(raw===null)return {day,count:0,items:[]};
 ok(rec(raw)&&Number.isSafeInteger(raw.day)&&raw.day<=day&&Number.isSafeInteger(raw.count)&&raw.count>=0&&raw.count<=DAILY_CAP&&Array.isArray(raw.items)&&raw.items.length<=DAILY_CAP*2,'invalid-telegram-state',503);
 return {day,count:raw.day===day?raw.count:0,items:raw.items.filter(x=>rec(x)&&Number.isSafeInteger(x.expires)&&x.expires>now)};
}
const batch=(tx,ps)=>tx.getAll?tx.getAll(ps):Promise.all(ps.map(p=>tx.get(p)));
export function createTelegramIdentityCore({run,secret,clock=Date.now,random=crypto}){
 ok(typeof run==='function'&&typeof secret==='string'&&/^[a-fA-F0-9]{64}$/.test(secret),'telegram-disabled',503);
 const encoder=new TextEncoder();
 const key=crypto.subtle.importKey('raw',Uint8Array.from(secret.match(/../g),x=>parseInt(x,16)),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const hash=async(kind,value)=>Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',await key,encoder.encode(kind+':'+value))),x=>x.toString(16).padStart(2,'0')).join('');
 const newToken=()=>Array.from(random.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
 // Rejection sampling avoids modulo bias.
 const newCode=()=>{for(let i=0;i<32;i++){const n=random.getRandomValues(new Uint32Array(1))[0];if(n<4294000000)return String(n%1000000).padStart(6,'0');}fail('telegram-unavailable',503);};
 async function begin(actor,{phone,mode}){
  ok(actorOk(actor,mode)&&phoneOk(phone),'invalid-telegram-request');
  const now=clock(),token=newToken(),challenge=await hash('challenge',token),number=await hash('phone',phone);
  await run(async tx=>{
   const [role,raw,linked]=await batch(tx,[paths.admin(actor.uid),statePath,uidPath(actor.uid)]);
   ok(role!==true,'forbidden',403);ok(linked===null||mode==='bind','telegram-already-linked',409);
   const state=readState(raw,now);
   ok(state.count<DAILY_CAP&&state.items.length<DAILY_CAP*2,'telegram-rate',429);
   ok(!state.items.some(x=>(x.actor===actor.uid||same(x.number,number))&&x.created+COOLDOWN_MS>now),'telegram-rate',429);
   // New attempts invalidate the actor's earlier challenges without affecting other customers.
   state.items=state.items.filter(x=>x.actor!==actor.uid);
   state.items.push({challenge,number,actor:actor.uid,mode,created:now,expires:now+CHALLENGE_MS,attempts:0,status:'new'});
   state.count++;tx.set(statePath,state);
  });
  return {token,expiresIn:CHALLENGE_MS/1000};
 }
 async function start(token,telegramId){
  ok(tokenOk(token)&&idOk(telegramId),'invalid-telegram-request');
  const now=clock(),challenge=await hash('challenge',token),telegram=await hash('telegram',telegramId);
  return run(async tx=>{
   const state=readState(await tx.get(statePath),now),item=state.items.find(x=>same(x.challenge,challenge));
   if(!item||item.status!=='new'&&item.status!=='started'||item.telegram&&!same(item.telegram,telegram))return false;
   // A chat may have at most one active contact prompt.
   for(const old of state.items)if(old!==item&&same(old.telegram,telegram)&&old.status==='started')old.status='closed';
   item.telegram=telegram;item.status='started';tx.set(statePath,state);return true;
  });
 }
 async function contact(telegramId,contactId,rawPhone){
  const phone=normalizePhone(rawPhone);
  if(!idOk(telegramId)||contactId!==telegramId||!phone)return null;
  const now=clock(),telegram=await hash('telegram',telegramId),number=await hash('phone',phone),code=newCode();
  return run(async tx=>{
   const state=readState(await tx.get(statePath),now),item=state.items.find(x=>x.status==='started'&&same(x.telegram,telegram));
   if(!item||!same(item.number,number))return null;
   item.code=await hash('otp',item.challenge+':'+code);item.status='contact';tx.set(statePath,state);
   return code;
  });
 }
 async function finish(actor,{token,code}){
  ok(rec(actor)&&uidOk(actor.uid)&&tokenOk(token)&&typeof code==='string'&&/^\d{6}$/.test(code),'invalid-telegram-request');
  const now=clock(),challenge=await hash('challenge',token),proof=await hash('otp',challenge+':'+code);
  return run(async tx=>{
   const [raw,role]=await batch(tx,[statePath,paths.admin(actor.uid)]);
   ok(role!==true,'forbidden',403);
   const state=readState(raw,now),item=state.items.find(x=>same(x.challenge,challenge)&&x.actor===actor.uid);
   if(!item||item.status!=='contact'||!actorOk(actor,item.mode)||item.attempts>=MAX_ATTEMPTS)return {status:'invalid'};
   if(!same(item.code,proof)){
    item.attempts++;if(item.attempts>=MAX_ATTEMPTS)item.status='closed';tx.set(statePath,state);return {status:'invalid'};
   }
   const [byTg,byPhone,byActor]=await batch(tx,[tgPath(item.telegram),phonePath(item.number),uidPath(actor.uid)]);
   // Once verified, consume the challenge even on conflicts; never merge accounts.
   item.status='closed';delete item.code;
   if(item.mode==='bind'){
    if(byTg!==null||byPhone!==null||byActor!==null){
     // A fresh full proof can recover a lost bind acknowledgement for the exact same UID.
     const matches=b=>rec(b)&&b.uid===actor.uid&&same(b.telegram,item.telegram)&&same(b.number,item.number);
     tx.set(statePath,state);
     return matches(byTg)&&matches(byPhone)&&matches(byActor)?{status:'bound',uid:actor.uid}:{status:'conflict'};
    }
    const binding={uid:actor.uid,telegram:item.telegram,number:item.number};
    tx.set(tgPath(item.telegram),binding);tx.set(phonePath(item.number),binding);tx.set(uidPath(actor.uid),binding);
    tx.set(statePath,state);return {status:'bound',uid:actor.uid};
   }
   if(byActor!==null||!rec(byTg)||!rec(byPhone)||!uidOk(byTg.uid)||byTg.uid!==byPhone.uid||!same(byTg.telegram,item.telegram)||!same(byTg.number,item.number)||!same(byPhone.telegram,item.telegram)||!same(byPhone.number,item.number)){
    tx.set(statePath,state);return {status:'conflict'};
   }
   const target=byTg.uid;
   const [targetRole,reverse]=await batch(tx,[paths.admin(target),uidPath(target)]);
   if(targetRole===true||!rec(reverse)||reverse.uid!==target||!same(reverse.telegram,item.telegram)||!same(reverse.number,item.number)){
    tx.set(statePath,state);return {status:'conflict'};
   }
   // Server checks real guest history inside the same transaction. Client must additionally
   // hold checkout mutex and reject unresolved local pending attempts before exchange.
   const orders=await tx.query({from:[{collectionId:'n99Orders'}],where:{fieldFilter:{field:{fieldPath:'uid'},op:'EQUAL',value:{stringValue:actor.uid}}},limit:1});
   if(orders.length){tx.set(statePath,state);return {status:'guest-history'};}
   tx.set(statePath,state);return {status:'authorized',uid:target};
  });
 }
 return {begin,start,contact,finish};
}
// Accept only private, non-bot senders and their own contact; never use forwarded contacts.
export function parseTelegramUpdate(update){
 const m=update?.message,u=m?.from;
 if(!m||m.chat?.type!=='private'||!idOk(u?.id)||u.is_bot!==false||m.chat.id!==u.id||m.forward_origin||m.forward_date||m.is_automatic_forward)return null;
 if(typeof m.text==='string'){
  const token=m.text.match(/^\/start ([a-f0-9]{48})$/)?.[1];
  return token?{kind:'start',telegramId:u.id,token}:null;
 }
 const c=m.contact;
 if(c&&c.user_id===u.id&&normalizePhone(c.phone_number))return {kind:'contact',telegramId:u.id,contactId:c.user_id,phone:normalizePhone(c.phone_number)};
 return null;
}
