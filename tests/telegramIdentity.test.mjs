import test from 'node:test';
import assert from 'node:assert/strict';
import {createTelegramIdentityCore,parseTelegramUpdate,CHALLENGE_MS,COOLDOWN_MS,MAX_ATTEMPTS} from '../backend/telegram-identity.mjs';
import {paths} from '../backend/firestore-orders.mjs';
import {syntheticDatasetRunner} from '../backend/firestore-isolation.mjs';
const phone='+998900000000',tg=1001,actor={uid:'guest-a',anonymous:true},other={uid:'guest-b',anonymous:true};
function fixture(){
 const db=new Map([[paths.dataset,{kind:'synthetic-only',version:1}]]);
 let now=1800000000000,queue=Promise.resolve(),orders=new Set();
 const run=syntheticDatasetRunner(task=>{
  const next=queue.then(async()=>{
   const writes=new Map(),get=p=>structuredClone(db.get(p)??null);
   const result=await task({get:async p=>get(p),getAll:async ps=>ps.map(get),query:async q=>orders.has(q.where.fieldFilter.value.stringValue)?[{}]:[],set:(p,v)=>writes.set(p,structuredClone(v))});
   for(const [p,v] of writes)db.set(p,v);return result;
  });queue=next.catch(()=>{});return next;
 });
 return {db,orders,advance:ms=>{now+=ms;},core:createTelegramIdentityCore({run,secret:'ab'.repeat(32),clock:()=>now})};
}
async function proof(f,who,mode='bind',number=phone,id=tg){
 const {token}=await f.core.begin(who,{phone:number,mode});assert.equal(await f.core.start(token,id),true);
 const code=await f.core.contact(id,id,number);assert.match(code,/^\d{6}$/);return {token,code};
}
test('same UID binds and different empty guest can authenticate only once',async()=>{
 const f=fixture(),b=await proof(f,actor);
 assert.deepEqual(await f.core.finish(actor,b),{status:'bound',uid:actor.uid});
 assert.deepEqual(await f.core.finish(actor,b),{status:'invalid'});
 f.advance(COOLDOWN_MS+1);
 const l=await proof(f,other,'login');
 assert.deepEqual(await f.core.finish(other,l),{status:'authorized',uid:actor.uid});
 assert.deepEqual(await f.core.finish(other,l),{status:'invalid'});
 const serialized=JSON.stringify([...f.db]);
 assert.ok(!serialized.includes(phone));assert.ok(!serialized.includes(b.token));
});
test('foreign contact, incorrect phone and foreign app actor cannot verify',async()=>{
 const f=fixture(),{token}=await f.core.begin(actor,{phone,mode:'bind'});
 assert.equal(await f.core.start(token,tg),true);
 assert.equal(await f.core.start(token,tg+1),false);
 assert.equal(await f.core.contact(tg,tg+1,phone),null);
 assert.equal(await f.core.contact(tg,tg,'+998911111111'),null);
 const code=await f.core.contact(tg,tg,phone);
 assert.deepEqual(await f.core.finish(other,{token,code}),{status:'invalid'});
 assert.deepEqual(await f.core.finish(actor,{token,code}),{status:'bound',uid:actor.uid});
});
test('wrong codes persist attempt cap, challenge expires, resend throttled',async()=>{
 const f=fixture(),b=await proof(f,actor),wrong=b.code==='000000'?'111111':'000000';
 await assert.rejects(f.core.begin(actor,{phone,mode:'bind'}),/telegram-rate/);
 for(let i=0;i<MAX_ATTEMPTS;i++)assert.deepEqual(await f.core.finish(actor,{token:b.token,code:wrong}),{status:'invalid'});
 assert.deepEqual(await f.core.finish(actor,b),{status:'invalid'});
 f.advance(COOLDOWN_MS+1);const next=await proof(f,actor);f.advance(CHALLENGE_MS+1);
 assert.deepEqual(await f.core.finish(actor,next),{status:'invalid'});
});
test('duplicate mapping, admin binding and guest history switching fail closed',async()=>{
 const f=fixture();assert.deepEqual(await f.core.finish(actor,await proof(f,actor)),{status:'bound',uid:actor.uid});
 f.advance(COOLDOWN_MS+1);
 assert.deepEqual(await f.core.finish(other,await proof(f,other)),{status:'conflict'});
 f.advance(COOLDOWN_MS+1);f.orders.add(other.uid);
 assert.deepEqual(await f.core.finish(other,await proof(f,other,'login')),{status:'guest-history'});
 f.db.set(paths.admin('admin'),true);
 await assert.rejects(f.core.begin({uid:'admin',anonymous:true},{phone,mode:'bind'}),/forbidden/);
 await assert.rejects(f.core.begin({uid:'unverified',anonymous:false,emailVerified:false},{phone,mode:'bind'}),/invalid-telegram-request/);
});
test('private Telegram parser rejects bot, group, forwarded and third-party contact',()=>{
 const msg={chat:{type:'private',id:tg},from:{id:tg,is_bot:false},contact:{user_id:tg,phone_number:'998900000000'}};
 assert.deepEqual(parseTelegramUpdate({message:msg}),{kind:'contact',telegramId:tg,contactId:tg,phone});
 for(const patch of [{chat:{type:'group',id:tg}},{from:{id:tg,is_bot:true}},{forward_origin:{}},{contact:{user_id:tg+1,phone_number:phone}}])assert.equal(parseTelegramUpdate({message:{...msg,...patch}}),null);
});
test('concurrent same proof has exactly one successful redemption',async()=>{
 const f=fixture(),b=await proof(f,actor);
 const out=await Promise.all([f.core.finish(actor,b),f.core.finish(actor,b)]);
 assert.equal(out.filter(x=>x.status==='bound').length,1);
});

test('fresh proof recovers only the exact same committed binding after lost response',async()=>{
 const f=fixture();await f.core.finish(actor,await proof(f,actor));
 f.advance(COOLDOWN_MS+1);
 assert.deepEqual(await f.core.finish(actor,await proof(f,actor)),{status:'bound',uid:actor.uid});
 f.advance(COOLDOWN_MS+1);
 assert.deepEqual(await f.core.finish(actor,await proof(f,actor,'bind','+998911111111',tg+1)),{status:'conflict'});
});
