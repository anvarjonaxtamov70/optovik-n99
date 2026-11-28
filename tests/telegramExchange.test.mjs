import test from 'node:test';
import assert from 'node:assert/strict';
import {createTelegramExchange,lookupTelegramTarget} from '../backend/telegram-exchange.mjs';
const env={FIREBASE_PROJECT_ID:'optovik-n99-staging',N99_DATASET:'synthetic-only',N99_FIRESTORE_CANDIDATE:'enabled',N99_TELEGRAM_AUTH:'enabled',N99_TELEGRAM_EXCHANGE:'enabled',TELEGRAM_BOT_TOKEN:'123456789:synthetic_token_1234567890',TELEGRAM_WEBHOOK_SECRET:'a'.repeat(64),TELEGRAM_IDENTITY_SECRET:'b'.repeat(64)};
const actor={uid:'guest',anonymous:true},now=1800000000000;
const req=(path,b)=>new Request('https://test.invalid/v1/telegram/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
function fixture(patch={}){
 const calls=[];
 const exchange=createTelegramExchange({clock:()=>now,authenticate:async()=>actor,coreFor:async()=>({begin:async(who,b)=>{calls.push(['begin',who,b]);return {token:'a'.repeat(48),expiresIn:300};},finish:async(who,b)=>{calls.push(['finish',who,b]);return {status:'authorized',uid:'target'};}}),checkTarget:async(_env,uid)=>{calls.push(['check',uid]);return true;},sign:async(_env,result)=>{calls.push(['sign',result]);return 'synthetic-token';},...patch});
 return {exchange,calls};
}
test('exchange opt-in is separate and client cannot supply target UID',async()=>{
 const f=fixture();
 assert.equal((await f.exchange(req('begin',{phone:'+998900000000',mode:'bind'}),{...env,N99_TELEGRAM_EXCHANGE:undefined})).status,503);
 assert.equal((await f.exchange(req('finish',{token:'a',code:'123456',uid:'admin'}),env)).status,400);
 assert.equal(f.calls.length,0);
});
test('only committed and checked identity receives a token',async()=>{
 const f=fixture();
 const res=await f.exchange(req('finish',{token:'a',code:'123456'}),env);
 assert.deepEqual(await res.json(),{status:'authorized',uid:'target',customToken:'synthetic-token'});
 assert.deepEqual(f.calls.map(x=>x[0]),['finish','check','sign']);
 assert.equal(res.headers.get('Cache-Control'),'no-store');
});
test('missing or disabled target and conflict never reach signer',async()=>{
 const f=fixture({checkTarget:async()=>false});
 assert.deepEqual(await (await f.exchange(req('finish',{token:'a',code:'123456'}),env)).json(),{status:'conflict'});
 assert.ok(!f.calls.some(x=>x[0]==='sign'));
 const g=fixture({coreFor:async()=>({finish:async()=>({status:'guest-history'})})});
 assert.deepEqual(await (await g.exchange(req('finish',{token:'a',code:'123456'}),env)).json(),{status:'guest-history'});
 assert.equal(g.calls.length,0);
});
test('target lookup fixed project; deleted, disabled or unverified email rejected',async()=>{
 for(const [user,expected] of [[{localId:'target'},true],[{localId:'target',email:'test@example.test',emailVerified:true},true],[{localId:'target',email:'test@example.test'},false],[{localId:'target',disabled:true},false],[{localId:'other'},false],[null,false]]){
  const value=await lookupTelegramTarget({uid:'target',access:'synthetic',deadline:now+8000,clock:()=>now,fetcher:async(url,opt)=>{
   assert.equal(url,'https://identitytoolkit.googleapis.com/v1/projects/optovik-n99-staging/accounts:lookup');
   assert.deepEqual(JSON.parse(opt.body),{localId:['target']});
   return Response.json({users:user?[user]:[]});
  }});
  assert.equal(value,expected);
 }
});
