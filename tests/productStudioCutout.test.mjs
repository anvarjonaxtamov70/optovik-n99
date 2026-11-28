import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareTensor,logitsToMask,applyStudioMask,MODEL_BYTES,MODEL_SHA256} from '../public/studio-local/mask.mjs';
import {createStudioCutoutEngine} from '../src/lib/productStudioCutout.web.ts';
test('model identity and ImageNet channel-first normalization',()=>{
 assert.equal(MODEL_BYTES,101066931);assert.match(MODEL_SHA256,/^[0-9a-f]{64}$/);
 const t=prepareTensor(new Uint8ClampedArray([255,0,128,255]),1);
 assert.ok(Math.abs(t[0]-(1-.485)/.229)<1e-6);
 assert.ok(Math.abs(t[1]-(0-.456)/.224)<1e-6);
 assert.ok(Math.abs(t[2]-(128/255-.406)/.225)<1e-6);
 assert.throws(()=>prepareTensor(new Uint8ClampedArray(3),1),/studio-mask-input/);
});
test('logits become bounded soft alpha and degenerate masks fail closed',()=>{
 const m=logitsToMask(Float32Array.of(-10,10,-1,1),2);
 assert.ok(m[0]<.001&&m[1]>.999&&m[2]<.5&&m[3]>.5);
 for(const values of [[-10,-10,-10,-10],[10,10,10,10],[0,0,NaN,0]])assert.throws(()=>logitsToMask(Float32Array.from(values),2),/studio-mask/);
});
test('mask preserves RGB, original alpha, and input bytes',()=>{
 const source=new Uint8ClampedArray([1,2,3,255,4,5,6,128,7,8,9,255,10,11,12,255]),before=source.slice();
 const out=applyStudioMask(source,2,2,Float32Array.of(0,1,.5,1),2);
 assert.deepEqual([...out],[1,2,3,0,4,5,6,128,7,8,9,128,10,11,12,255]);assert.deepEqual(source,before);
});
test('bilinear resizing retains soft edges and validates bounds',()=>{
 const out=applyStudioMask(new Uint8ClampedArray([1,2,3,255]),1,1,Float32Array.of(0,1,0,1),2);
 assert.equal(out[3],128);
 assert.throws(()=>applyStudioMask(new Uint8ClampedArray(4),1,1,Float32Array.of(NaN),1),/studio-mask-output/);
});
const source=new Blob([Uint8Array.of(255,216,255,1)],{type:'image/jpeg'}),png=new Blob([Uint8Array.of(137,80,78,71,13,10,26,10)],{type:'image/png'});
function fixture(){
 const workers=[];
 const createWorker=()=>{const w={onmessage:null,onerror:null,onmessageerror:null,terminated:false,postMessage(data){this.sent=data;},terminate(){this.terminated=true;}};workers.push(w);return w;};
 return {workers,createWorker};
}
const tick=()=>new Promise(resolve=>setImmediate(resolve));
test('worker is lazy and reused after successful local result',async()=>{
 const f=fixture(),engine=createStudioCutoutEngine({createWorker:f.createWorker});
 assert.equal(f.workers.length,0);
 for(let i=0;i<2;i++){
  const p=engine.removeBackground(source);await tick();const w=f.workers[0];
  w.onmessage({data:{id:w.sent.id,blob:png}});assert.equal(await p,png);
 }
 assert.equal(f.workers.length,1);engine.dispose();assert.equal(f.workers[0].terminated,true);
});
test('duplicate operations and invalid input are rejected',async()=>{
 const f=fixture(),engine=createStudioCutoutEngine({createWorker:f.createWorker});
 await assert.rejects(engine.removeBackground(new Blob(['svg'],{type:'image/png'})),/studio-source-type/);
 const p=engine.removeBackground(source);await tick();
 await assert.rejects(engine.removeBackground(source),/studio-busy/);
 const w=f.workers[0];w.onmessage({data:{id:w.sent.id,error:'studio-mask-uncertain'}});
 await assert.rejects(p,/studio-mask-uncertain/);assert.equal(w.terminated,true);
 engine.dispose();
});
test('abort stops worker and next attempt starts fresh',async()=>{
 const f=fixture(),engine=createStudioCutoutEngine({createWorker:f.createWorker}),abort=new AbortController();
 const first=engine.removeBackground(source,abort.signal);await tick();abort.abort();await assert.rejects(first,/studio-cancelled/);
 assert.equal(f.workers[0].terminated,true);
 const second=engine.removeBackground(source);await tick();const w=f.workers[1];w.onmessage({data:{id:w.sent.id,blob:png}});
 assert.equal(await second,png);engine.dispose();
});
test('timeout terminates worker and dispose prevents future work',async()=>{
 const f=fixture(),engine=createStudioCutoutEngine({createWorker:f.createWorker,timeoutMs:15});
 await assert.rejects(engine.removeBackground(source),/studio-cutout-timeout/);assert.equal(f.workers[0].terminated,true);
 engine.dispose();await assert.rejects(engine.removeBackground(source),/studio-cancelled/);
});
test('unexpected output and upstream messages are not trusted',async()=>{
 const f=fixture(),engine=createStudioCutoutEngine({createWorker:f.createWorker});
 const p=engine.removeBackground(source);await tick();const w=f.workers[0];w.onmessage({data:{id:w.sent.id,error:'private stack'}});
 await assert.rejects(p,/^Error: studio-cutout-unavailable$/);engine.dispose();
});
