import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { TransactionPrototype } from '../backend/prototype/transaction-store.mjs';
const now=1800000000000;
const id=i=>'-'+String(i).padStart(19,'0');
const order=i=>({id:id(i),raqam:123456+i,order:{mijoz:{ism:'Synthetic',telefon:'+998900000000'},yetkazish:{turi:'olib'},tolov:'naqd',til:'uz',platforma:'ios',items:{optika:{fara:{narxi:100,soni:1}}},summa:100,jami:100,soni:1,yetkazishNarxi:0}});
const change=(uid,i,expected,next)=>({uid,id:id(i),expected,next});
async function setup(t,stock=3){
  const dir=await mkdtemp(join(tmpdir(),'n99-concurrency-'));
  const filename=join(dir,'synthetic.sqlite');
  const db=new TransactionPrototype({filename});
  t.after(async()=>{db.close();await rm(dir,{recursive:true,force:true});});
  db.seedAdmin('admin');
  db.seedSettings({pickupEnabled:true,courierEnabled:true,courierFee:0,freeDeliveryFrom:0});
  db.seedProduct('optika','fara',{nomi:'Synthetic',narxi:100,qoldiq:stock,revision:1});
  return {db,filename};
}
async function parallel(filename,operations){
  const handles=[];
  try{
    for(const [operation,args] of operations){
      const worker=new Worker(new URL('./helpers/transaction-thread.mjs',import.meta.url),{workerData:{filename,operation,args}});
      let resolveReady,rejectReady,resolveDone,rejectDone;
      const ready=new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;});
      const done=new Promise((resolve,reject)=>{resolveDone=resolve;rejectDone=reject;});
      // Attach early handlers so a failed initialization cannot become an unhandled rejection.
      ready.catch(()=>{});done.catch(()=>{});
      let finished=false;
      const fail=error=>{rejectReady(error);rejectDone(error);};
      worker.on('message',message=>{
        if(message.ready)resolveReady();
        else if(message.result){finished=true;resolveDone(message.result);}
        else if(message.failure)fail(new Error(message.failure));
      });
      worker.on('error',fail);
      worker.on('exit',code=>{if(!finished||code!==0)fail(new Error('Worker exited before completing test: '+code));});
      handles.push({worker,ready,done});
    }
    await Promise.all(handles.map(h=>h.ready));
    // Every connection is open before the start signal.
    for(const h of handles)h.worker.postMessage('start');
    return await Promise.all(handles.map(h=>h.done));
  }finally{await Promise.allSettled(handles.map(h=>h.worker.terminate()));}
}
test('six concurrent connections replay one checkout without duplicate rows or events',{timeout:30000},async t=>{
  const {db,filename}=await setup(t);
  const results=await parallel(filename,Array.from({length:6},()=>['create',['u1',order(1),now]]));
  assert.ok(results.every(r=>r.ok));
  assert.equal(results.filter(r=>!r.value.recovered).length,1);
  assert.deepEqual(db.counts(),{orders:1,events:1});
});
test('six concurrent confirmations reserve at most the three available units',{timeout:30000},async t=>{
  const {db,filename}=await setup(t);
  for(let i=0;i<6;i++)db.create('u'+i,order(i),now);
  const results=await parallel(filename,Array.from({length:6},(_,i)=>['change',['admin',change('u'+i,i,'yangi','tasdiqlandi'),now+1]]));
  assert.equal(results.filter(r=>r.ok).length,3);
  assert.ok(results.filter(r=>!r.ok).every(r=>r.status===409&&r.code==='stock-unavailable'));
  assert.equal(db.product('optika','fara').qoldiq,0);
  assert.equal(db.product('optika','fara').revision,4);
  assert.equal(Array.from({length:6},(_,i)=>db.order(id(i))).filter(o=>o.holat==='tasdiqlandi').length,3);
  assert.deepEqual(db.counts(),{orders:6,events:9});
});
test('six concurrent cancellation replays restore one reserved unit only once',{timeout:30000},async t=>{
  const {db,filename}=await setup(t,1);
  db.create('u1',order(1),now);
  db.change('admin',change('u1',1,'yangi','tasdiqlandi'),now+1);
  const results=await parallel(filename,Array.from({length:6},()=>['change',['admin',change('u1',1,'tasdiqlandi','bekor'),now+2]]));
  assert.ok(results.every(r=>r.ok));
  assert.equal(db.product('optika','fara').qoldiq,1);
  assert.equal(db.product('optika','fara').revision,3);
  assert.deepEqual(db.counts(),{orders:1,events:3});
});
