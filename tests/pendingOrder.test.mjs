import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePendingOrder, recoverConfirmedPending } from '../src/domain/pendingOrder.ts';
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
