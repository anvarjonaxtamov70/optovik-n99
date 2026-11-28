import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../backend/firestore-worker.mjs';
test('retired Telegram routes cannot be activated by stale environment flags',async()=>{
 const env={FIREBASE_PROJECT_ID:'optovik-n99-staging',N99_DATASET:'synthetic-only',N99_FIRESTORE_CANDIDATE:'enabled',N99_TELEGRAM_AUTH:'enabled',N99_TELEGRAM_EXCHANGE:'enabled',TELEGRAM_BOT_TOKEN:'123456789:synthetic_token_1234567890',TELEGRAM_WEBHOOK_SECRET:'a'.repeat(64),TELEGRAM_IDENTITY_SECRET:'b'.repeat(64)};
 for(const path of ['/telegram/webhook','/v1/telegram/begin','/v1/telegram/finish','/v1/sms/begin','/v1/sms/finish']){
  const res=await worker.fetch(new Request('https://test.invalid'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}),env);
  assert.equal(res.status,404);
  assert.deepEqual(await res.json(),{error:'not-found'});
 }
});
