import test from 'node:test';
import assert from 'node:assert/strict';
import {createEskizSender,eskizReady} from '../backend/eskiz-sms.mjs';
const env={FIREBASE_PROJECT_ID:'optovik-n99-staging',N99_DATASET:'synthetic-only',N99_SMS_ENABLED:'enabled',ESKIZ_EMAIL:'test@example.test',ESKIZ_API_PASSWORD:'synthetic-secret',ESKIZ_SENDER:'4546',ESKIZ_OTP_TEMPLATE:'OPTOVIK N99: Kod {code}. Hech kimga bermang.'};
test('Eskiz disabled by default, never production or missing secret or template',()=>{
 for(const patch of [{N99_SMS_ENABLED:undefined},{FIREBASE_PROJECT_ID:'production'},{ESKIZ_API_PASSWORD:''},{ESKIZ_OTP_TEMPLATE:'no placeholder'},{ESKIZ_OTP_TEMPLATE:'{code} {code}'}]){
  assert.equal(eskizReady({...env,...patch}),false);assert.throws(()=>createEskizSender({...env,...patch}),/sms-disabled/);
 }
});
test('Eskiz only sends a fixed approved template with canonical phone and bearer auth',async()=>{
 const requests=[];
 const send=createEskizSender(env,{fetcher:async(url,opts)=>{
  requests.push({url,opts});
  return Response.json(url.endsWith('/auth/login')?{data:{token:'synthetic-token'}}:{status:'waiting',id:'synthetic-id'});
 }});
 assert.deepEqual(await send({phone:'+998900000000',code:'123456'}),{accepted:true});
 assert.equal(requests[0].url,'https://notify.eskiz.uz/api/auth/login');
 assert.equal(requests[1].url,'https://notify.eskiz.uz/api/message/sms/send');
 assert.equal(requests[1].opts.body.get('mobile_phone'),'998900000000');
 assert.equal(requests[1].opts.body.get('message'),'OPTOVIK N99: Kod 123456. Hech kimga bermang.');
 assert.equal(requests[1].opts.headers.Authorization,'Bearer synthetic-token');
 assert.equal(requests[1].opts.redirect,'error');
 await send({phone:'+998900000000',code:'000001'});
 assert.equal(requests.length,3);
 await assert.rejects(send({phone:'998900000000',code:'123456'}),/sms-invalid-input/);
 assert.equal(requests.length,3);
});
test('provider rejection or ambiguous send never retries or exposes upstream private data',async()=>{
 let calls=0;
 const send=createEskizSender(env,{fetcher:async(url)=>{
  calls++;
  if(url.endsWith('/auth/login'))return Response.json({data:{token:'synthetic-token'}});
  return Response.json({status:'error',message:'private body'});
 }});
 await assert.rejects(send({phone:'+998900000000',code:'123456'}),{message:'sms-provider-rejected'});
 assert.equal(calls,2);
});
