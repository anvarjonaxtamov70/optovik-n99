import test from 'node:test';
import assert from 'node:assert/strict';
import {createProfileWriteQueue} from '../src/domain/profileWriteQueue.ts';
test('overlapping profile edits finish in submission order and pending refresh remains blocked',async()=>{
 const q=createProfileWriteQueue(),seen=[];
 let release;const gate=new Promise(r=>{release=r;});
 const a=q.run(async()=>{seen.push('first-start');await gate;seen.push('first-end');});
 const b=q.run(async()=>{seen.push('second');return 2;});
 await Promise.resolve();assert.deepEqual(seen,['first-start']);assert.equal(q.busy(),true);
 release();await a;assert.equal(await b,2);
 assert.deepEqual(seen,['first-start','first-end','second']);assert.equal(q.busy(),false);
});
test('failed profile save does not poison the next queued write',async()=>{
 const q=createProfileWriteQueue();
 const bad=q.run(async()=>{throw Error('offline');});
 const good=q.run(async()=>42);
 await assert.rejects(bad,/offline/);assert.equal(await good,42);assert.equal(q.busy(),false);
});
