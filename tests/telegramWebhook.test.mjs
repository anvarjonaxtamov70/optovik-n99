import test from 'node:test';
import assert from 'node:assert/strict';
import {createTelegramWebhook,telegramTransportReady} from '../backend/telegram-webhook.mjs';
const env={FIREBASE_PROJECT_ID:'optovik-n99-staging',N99_DATASET:'synthetic-only',N99_FIRESTORE_CANDIDATE:'enabled',N99_TELEGRAM_AUTH:'enabled',TELEGRAM_BOT_TOKEN:'123456789:synthetic_token_1234567890',TELEGRAM_WEBHOOK_SECRET:'a'.repeat(64),TELEGRAM_IDENTITY_SECRET:'b'.repeat(64)};
const now=1800000000000, id=1001;
function fixture(){
 const sent=[],calls=[];
 const webhook=createTelegramWebhook({clock:()=>now,coreFor:async()=>({start:async(...args)=>{calls.push(['start',...args]);return true;},contact:async(...args)=>{calls.push(['contact',...args]);return '123456';}}),fetcher:async(url,opt)=>{sent.push({url,body:JSON.parse(opt.body),redirect:opt.redirect});return Response.json({ok:true});}});
 const msg={chat:{type:'private',id},from:{id,is_bot:false}};
 const req=(patch,secret=env.TELEGRAM_WEBHOOK_SECRET)=>new Request('https://test.invalid/telegram/webhook',{method:'POST',headers:{'Content-Type':'application/json','X-Telegram-Bot-Api-Secret-Token':secret},body:JSON.stringify({message:{...msg,...patch}})});
 return {webhook,sent,calls,req};
}
test('webhook is disabled by default, production, missing or reused secret',async()=>{
 const f=fixture();
 for(const patch of [{N99_TELEGRAM_AUTH:'disabled'},{FIREBASE_PROJECT_ID:'production'},{TELEGRAM_IDENTITY_SECRET:env.TELEGRAM_WEBHOOK_SECRET}]){
  assert.equal(telegramTransportReady({...env,...patch}),false);
  assert.equal((await f.webhook(f.req({text:'/start'}),{...env,...patch})).status,503);
 }
 assert.equal(f.sent.length,0);
});
test('wrong webhook secret, forwarded and group contact never access core',async()=>{
 const f=fixture();
 assert.equal((await f.webhook(f.req({text:'/start'},'wrong'),env)).status,403);
 assert.equal((await f.webhook(f.req({chat:{type:'group',id},contact:{user_id:id,phone_number:'998900000000'}}),env)).status,200);
 assert.equal((await f.webhook(f.req({forward_origin:{},contact:{user_id:id,phone_number:'998900000000'}}),env)).status,200);
 assert.equal(f.calls.length,0);assert.equal(f.sent.length,0);
});
test('private start requests own contact and accepted proof returns protected code',async()=>{
 const f=fixture(),token='a'.repeat(48);
 assert.equal((await f.webhook(f.req({text:'/start '+token}),env)).status,200);
 assert.equal(f.sent[0].body.reply_markup.keyboard[0][0].request_contact,true);
 assert.deepEqual(f.calls[0],['start',token,id]);
 assert.equal((await f.webhook(f.req({contact:{user_id:id,phone_number:'998900000000'}}),env)).status,200);
 assert.deepEqual(f.calls[1],['contact',id,id,'+998900000000']);
 assert.match(f.sent[1].body.text,/123456/);
 assert.equal(f.sent[1].body.protect_content,true);
 assert.equal(f.sent[1].body.reply_markup.remove_keyboard,true);
 assert.equal(f.sent[1].redirect,'error');
});
test('plain start only provides app instructions; no identity or code generated',async()=>{
 const f=fixture();
 assert.equal((await f.webhook(f.req({text:'/start'}),env)).status,200);
 assert.equal(f.calls.length,0);assert.equal(f.sent.length,1);
});
test('ambiguous transport failure returns fixed status without leaking upstream response',async()=>{
 const f=fixture(),webhook=createTelegramWebhook({coreFor:async()=>({start:async()=>true}),fetcher:async()=>{throw new Error('private token');}});
 const res=await webhook(f.req({text:'/start '+'a'.repeat(48)}),env);
 assert.equal(res.status,503);assert.equal(await res.text(),'');
});
