import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePendingOrder, recoverConfirmedPending, checkoutIntent, canRetryPending } from '../src/domain/pendingOrder.ts';
test('pending order metadata is strictly validated for checkout and recovery', () => {
 const id = '-1234567890123456789';
 assert.deepEqual(parsePendingOrder({id,raqam:123456}),{id,raqam:123456});
 for (const raw of [null, [], {}, {id:123,raqam:123456},{id,raqam:'123456'},{id,raqam:99999},{id,raqam:1000000},{id,raqam:123456.5},{id:'bad/path',raqam:123456}]) assert.equal(parsePendingOrder(raw),null);
});

test('automatic recovery does not apply an absent or mismatched server order', async () => {
 const meta={id:'-1234567890123456789',raqam:123456};
 let applied=0;
 const run=read=>recoverConfirmedPending({active:()=>true,load:async()=>meta,read,apply:async()=>{applied++;}});
 assert.equal(await run(async()=>null),'unresolved');
 assert.equal(await run(async()=>({raqam:654321})),'unresolved');
 assert.equal(applied,0);
 assert.equal(await run(async()=>({raqam:123456})),'applied');
 assert.equal(applied,1);
});
test('automatic recovery stops if the account changes during a read',async()=>{
 let active=true,applied=0;
 const result=await recoverConfirmedPending({active:()=>active,load:async()=>({id:'-1234567890123456789',raqam:123456}),read:async()=>{active=false;return {raqam:123456};},apply:async()=>{applied++;}});
 assert.equal(result,'inactive');
 assert.equal(applied,0);
});
test('automatic recovery never reads the server when no pending order exists and preserves read failures',async()=>{
 let reads=0;
 const base={active:()=>true,read:async()=>{reads++;return null;},apply:async()=>{throw new Error('unexpected apply');}};
 assert.equal(await recoverConfirmedPending({...base,load:async()=>null}),'idle');
 assert.equal(await recoverConfirmedPending({...base,load:async()=>({id:'bad'})}),'unresolved');
 assert.equal(reads,0);
 await assert.rejects(recoverConfirmedPending({...base,load:async()=>{throw new Error('storage failed');}}),/storage failed/);
});

test('pending intent is deterministic for reordered object keys',()=>{
 const a={mijoz:{ism:'Synthetic',telefon:'+998900000000'},items:{b:{soni:1},a:{soni:2}},jami:300,createdAt:{'.sv':'timestamp'}};
 const b={createdAt:{'.sv':'timestamp'},jami:300,items:{a:{soni:2},b:{soni:1}},mijoz:{telefon:'+998900000000',ism:'Synthetic'}};
 assert.equal(checkoutIntent(a),checkoutIntent(b));
});
test('changed quantity, price, address or payment cannot reuse ambiguous pending key',()=>{
 const original={items:{a:{soni:1,narxi:100}},yetkazish:{turi:'kuryer',manzil:'Synthetic address'},tolov:'naqd',jami:100};
 const meta={id:'-1234567890123456789',raqam:123456,intent:checkoutIntent(original)};
 assert.equal(canRetryPending(parsePendingOrder(meta),checkoutIntent(original)),true);
 for(const changed of [{...original,items:{a:{soni:2,narxi:100}}},{...original,items:{a:{soni:1,narxi:90}}},{...original,yetkazish:{turi:'kuryer',manzil:'Other address'}},{...original,tolov:'other'}]){
   assert.equal(canRetryPending(parsePendingOrder(meta),checkoutIntent(changed)),false);
 }
 assert.equal(canRetryPending(null,checkoutIntent(original)),true);
});
test('legacy or malformed intent is read-only; never silently resubmit',()=>{
 const meta={id:'-1234567890123456789',raqam:123456};
 for(const intent of [undefined,{},'', 'x'.repeat(32769)]){
   const pending=parsePendingOrder({...meta,intent});
   assert.deepEqual(pending,meta);
   assert.equal(canRetryPending(pending,checkoutIntent({jami:1})),false);
 }
 assert.throws(()=>checkoutIntent({invalid:Infinity}),/Invalid checkout intent/);
 assert.throws(()=>checkoutIntent({note:'x'.repeat(32769)}),/too large/);
});
