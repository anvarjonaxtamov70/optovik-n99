import test from 'node:test';
import assert from 'node:assert/strict';
import {syntheticDatasetRunner} from '../backend/firestore-isolation.mjs';
import {executeFirestoreOrder,paths} from '../backend/firestore-orders.mjs';
import {createFirestoreApi} from '../backend/firestore-api.mjs';
const id='abcdefghijklmnopqrst',uid='customer',actor='admin';
const order={raqam:123456,createdAt:1,updatedAt:1,holat:'yangi',tarix:{yangi:1},items:{cat:{p:{nomi:'Test',narxi:10,soni:2}}},yetkazish:{turi:'olib'},summa:20,soni:2,yetkazishNarxi:0,jami:20};
function setup(marker={kind:'synthetic-only',version:1}){
 const docs=new Map([[paths.dataset,marker],[paths.order(id),{order:structuredClone(order),index:{uid,raqam:123456,holat:'yangi'}}],[paths.admin(actor),true],[paths.product('cat','p'),{qoldiq:6,revision:0}]]);
 const batches=[];
 const run=syntheticDatasetRunner(async task=>{
  const writes=new Map();
  const read=path=>structuredClone(docs.get(path)??null);
  const result=await task({get:async path=>{batches.push([path]);return read(path);},getAll:async ps=>{batches.push(ps);return ps.map(read);},set:(path,value)=>writes.set(path,structuredClone(value))});
  for(const [path,value] of writes)docs.set(path,value);
  return result;
 });
 return {docs,batches,run};
}
test('transition batches dataset, order and role; ack follows reserve and release',async()=>{
 const {docs,batches,run}=setup();
 const confirm={id,uid,expected:'yangi',next:'tasdiqlandi',includeOrder:true};
 const ack=await executeFirestoreOrder(run,'change',actor,confirm,2);
 assert.equal(ack.order.holat,'tasdiqlandi');
 assert.equal(ack.order.zaxira,true);
 assert.deepEqual(batches,[[paths.dataset,paths.order(id),paths.admin(actor)],[paths.product('cat','p')]]);
 assert.equal(docs.get(paths.product('cat','p')).qoldiq,4);
 batches.length=0;
 await executeFirestoreOrder(run,'change',actor,confirm,3);
 assert.equal(batches.length,1);
 assert.equal(docs.get(paths.product('cat','p')).qoldiq,4);
 const cancel=await executeFirestoreOrder(run,'change',actor,{id,uid,expected:'tasdiqlandi',next:'bekor',includeOrder:true},4);
 assert.equal(cancel.order.zaxira,false);
 assert.equal(docs.get(paths.product('cat','p')).qoldiq,6);
});
test('dataset and authorization remain fail closed',async()=>{
 const invalid=setup({kind:'production',version:1});
 const b={id,uid,expected:'yangi',next:'tasdiqlandi',includeOrder:true};
 await assert.rejects(executeFirestoreOrder(invalid.run,'change',actor,b,2),/dataset-unavailable/);
 const noAdmin=setup();
 await assert.rejects(executeFirestoreOrder(noAdmin.run,'change','stranger',b,2),/forbidden/);
 assert.equal(noAdmin.batches.length,1);
 assert.equal(noAdmin.docs.get(paths.product('cat','p')).qoldiq,6);
});
test('timings expose only named durations, including failures',async()=>{
 const api=createFirestoreApi({enabled:()=>true,authenticate:async()=>{throw Object.assign(new Error('unauthenticated'),{status:401});},runner:async()=>{throw Error('unexpected');}});
 const res=await api.fetch(new Request('https://test.invalid/v1/transition',{method:'POST'}),{});
 assert.equal(res.status,401);
 assert.match(res.headers.get('Server-Timing'),/^auth;dur=\d+\.\d, total;dur=\d+\.\d$/);
});
