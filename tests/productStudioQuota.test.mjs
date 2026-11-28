import test from 'node:test';
import assert from 'node:assert/strict';
import {reserveStudioAttempt,STUDIO_QUOTA,checkStudioAdmin} from '../backend/product-studio-quota.mjs';
import {createStudioService} from '../backend/product-studio-service.mjs';
const now=1_800_000_000_000;
const step=STUDIO_QUOTA.cooldownMs;
function store(){
  const data=new Map(Array.from({length:6},(_,i)=>['n99Admins/a'+i,true]));
  let queue=Promise.resolve();
  const run=task=>{
    const result=queue.then(async()=>{
      const writes=new Map();
      const tx={get:async k=>data.get(k)??null,getAll:async keys=>keys.map(k=>data.get(k)??null),set:(k,v)=>writes.set(k,v)};
      const value=await task(tx);
      for(const [k,v] of writes)data.set(k,v);
      return value;
    });
    queue=result.catch(()=>{});
    return result;
  };
  return {data,run};
}
const rejects=(promise,code)=>assert.rejects(promise,{code});
test('admin role is read from the trusted store, not claimed by caller',async()=>{
  const {run,data}=store();
  await rejects(checkStudioAdmin(run,undefined),'unauthenticated');
  await rejects(reserveStudioAttempt(run,'customer',now),'forbidden');
  assert.equal(data.has('n99StudioQuota/global'),false);
});
test('first reservation consumes both quotas and cooldown blocks concurrent calls',async()=>{
  const {run}=store();
  const attempts=await Promise.allSettled([reserveStudioAttempt(run,'a0',now),reserveStudioAttempt(run,'a1',now)]);
  assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
  assert.equal(attempts.find(x=>x.status==='rejected').reason.code,'studio-cooldown');
  assert.deepEqual(await reserveStudioAttempt(run,'a0',now+step),{remainingGlobal:18,remainingAdmin:3});
});
test('per-admin limit and rolling 24-hour expiry',async()=>{
  const {run}=store();
  for(let i=0;i<5;i++)await reserveStudioAttempt(run,'a0',now+i*step);
  await rejects(reserveStudioAttempt(run,'a0',now+5*step),'studio-daily-limit');
  assert.equal((await reserveStudioAttempt(run,'a0',now+STUDIO_QUOTA.windowMs)).remainingAdmin,0);
});
test('global limit holds across multiple admins',async()=>{
  const {run}=store();
  for(let i=0;i<20;i++)await reserveStudioAttempt(run,'a'+Math.floor(i/5),now+i*step);
  await rejects(reserveStudioAttempt(run,'a5',now+20*step),'studio-daily-limit');
});
test('corrupt quota state or backwards clock fails closed',async()=>{
  const {run,data}=store();
  for(const raw of [{attempts:['1']},{attempts:[now+1]},{attempts:[now,now-1]},{attempts:Array(21).fill(now)},{}]){
    data.set('n99StudioQuota/global',raw);
    await rejects(reserveStudioAttempt(run,'a0',now),'studio-quota-unavailable');
  }
});
const bytes=new Uint8Array([1,2,3]);
const decoded={bytes,meta:{mime:'image/png',width:10,height:10,bytes:3}};
test('disabled service, unauthorized caller and invalid image never call Gemini',async()=>{
  const {run}=store();
  let decodes=0,calls=0;
  const config={run,clock:()=>now,decodeImage:async()=>{decodes++;return decoded;},analyze:async()=>{calls++;return {};}};
  await rejects(createStudioService(config)({uid:'a0',bytes}),'studio-disabled');
  const service=createStudioService({...config,enabled:true});
  await rejects(service({uid:'customer',bytes}),'forbidden');
  await rejects(service({uid:'a0',bytes:new Uint8Array()}),'invalid-image-size');
  assert.equal(decodes,0);assert.equal(calls,0);
});
test('invalid decoded metadata and changed admin role block provider',async()=>{
  const {run,data}=store();
  let calls=0;
  const config={run,enabled:true,clock:()=>now,analyze:async()=>{calls++;return {};}};
  await rejects(createStudioService({...config,decodeImage:async()=>({...decoded,meta:{...decoded.meta,width:9000}})})({uid:'a0',bytes}),'invalid-image-dimensions');
  await rejects(createStudioService({...config,decodeImage:async()=>{data.set('n99Admins/a0',false);return decoded;}})({uid:'a0',bytes}),'forbidden');
  assert.equal(calls,0);assert.equal(data.has('n99StudioQuota/global'),false);
});
test('quota commits before provider and is not refunded after error',async()=>{
  const {run,data}=store();
  let calls=0;
  const service=createStudioService({run,enabled:true,clock:()=>now,decodeImage:async()=>decoded,analyze:async()=>{calls++;assert.deepEqual(data.get('n99StudioQuota/global').attempts,[now]);throw Error('provider unavailable');}});
  await assert.rejects(service({uid:'a0',bytes}),/provider unavailable/);
  await rejects(service({uid:'a0',bytes}),'studio-cooldown');
  assert.equal(calls,1);
});
test('unavailable transaction cannot result in a provider call',async()=>{
  const {run}=store();let count=0,calls=0;
  const service=createStudioService({run:async task=>{if(++count===2)throw Error('commit uncertain');return run(task);},enabled:true,clock:()=>now,decodeImage:async()=>decoded,analyze:async()=>{calls++;return {};}});
  await assert.rejects(service({uid:'a0',bytes}),/commit uncertain/);
  assert.equal(calls,0);
});
test('successful service returns draft and quota without modifying catalog',async()=>{
  const {run,data}=store();
  const service=createStudioService({run,enabled:true,clock:()=>now,decodeImage:async()=>decoded,analyze:async()=>({nomi:'Filtr',requiresReview:true})});
  assert.deepEqual(await service({uid:'a0',bytes}),{draft:{nomi:'Filtr',requiresReview:true},quota:{remainingGlobal:19,remainingAdmin:4}});
  assert.equal([...data.keys()].filter(k=>k.startsWith('n99StudioQuota/')).length,2);
});
