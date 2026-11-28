import test from 'node:test';
import assert from 'node:assert/strict';
import {createFirestoreApi} from '../backend/firestore-api.mjs';
import candidate from '../backend/firestore-worker.mjs';
import {paths} from '../backend/firestore-orders.mjs';
const now=1800000000000,id='-AAAAAAAAAAAAAAAAAAA';
function request(path,body,token='guest'){
 return new Request('https://example.test'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:token},body:JSON.stringify(body)});
}
function fixture(){
 const db=new Map([[paths.admin('admin'),true],[paths.settings,{pickupEnabled:true,courierEnabled:true,courierFee:0,freeDeliveryFrom:0}],[paths.product('optika','fara'),{nomi:'Synthetic',narxi:100,qoldiq:2,revision:1}]]);
 let calls=0;
 const api=createFirestoreApi({enabled:()=>true,clock:()=>now,authenticate:async req=>{const token=req.headers.get('Authorization');if(!['guest','admin'].includes(token))throw Object.assign(new Error('unauthenticated'),{status:401});return token;},runner:async()=>{calls++;return async task=>{
   const writes=new Map();
   const result=await task({get:async p=>structuredClone(db.get(p)??null),set:(p,v)=>writes.set(p,structuredClone(v)),reference:p=>p,query:async()=>[]});
   for(const [p,v] of writes)db.set(p,v);return result;
 };}});
 return {db,api,calls:()=>calls};
}
test('candidate disabled by default; unknown route does not open database',async()=>{
 assert.equal((await candidate.fetch(request('/v1/orders',{}),{})).status,503);
 const f=fixture();
 assert.equal((await f.api.fetch(request('/v1/unknown',{}),{})).status,404);
 assert.equal(f.calls(),0);
});
test('authentication precedes database and malformed bodies are rejected',async()=>{
 const f=fixture();
 assert.equal((await f.api.fetch(request('/v1/orders',{},'bad'),{})).status,401);
 assert.equal((await f.api.fetch(request('/v1/orders',[]),{})).status,400);
 assert.equal(f.calls(),0);
});
test('admin operations use authenticated actor, never claimed UID',async()=>{
 const f=fixture(),body={actor:'admin',uid:'admin',cat:'optika',id:'fara',action:'quick',expectedRevision:1,patch:{qoldiq:3}};
 assert.equal((await f.api.fetch(request('/v1/admin/product',body),{})).status,403);
 assert.equal((await f.api.fetch(request('/v1/admin/orders/list',{admin:true,uid:'admin'}),{})).status,403);
 const res=await f.api.fetch(request('/v1/admin/product',body,'admin'),{});
 assert.equal(res.status,200);assert.equal(f.db.get(paths.product('optika','fara')).qoldiq,3);
});
test('checkout and authorized read share the same transaction store',async()=>{
 const f=fixture();
 const b={id,raqam:123456,uid:'admin',order:{mijoz:{ism:'Synthetic',telefon:'+998900000000'},yetkazish:{turi:'olib'},tolov:'naqd',til:'uz',platforma:'ios',items:{optika:{fara:{narxi:100,soni:1}}},summa:100,jami:100,soni:1,yetkazishNarxi:0}};
 const res=await f.api.fetch(request('/v1/orders',b),{});
 assert.equal(res.status,200);assert.equal(f.db.get(paths.order(id)).index.uid,'guest');
 const order=await f.api.fetch(request('/v1/orders/get',{id}),{});
 assert.equal((await order.json()).order.raqam,123456);
 assert.equal(order.headers.get('Cache-Control'),'no-store');
});
test('API suppresses unexpected upstream error messages',async()=>{
 const api=createFirestoreApi({enabled:()=>true,authenticate:async()=>'guest',runner:async()=>{throw new Error('synthetic private detail');}});
 const res=await api.fetch(request('/v1/orders/list',{}),{});
 assert.equal(res.status,503);assert.deepEqual(await res.json(),{error:'unavailable'});
});

test('read routes use read-only transaction and mutation routes ignore client readOnly flag',async()=>{
 const modes=[];
 const api=createFirestoreApi({enabled:()=>true,authenticate:async()=> 'guest',runner:async()=>async(task,_initial,options)=>{
  modes.push(options.readOnly);throw Object.assign(Error('hidden'),{status:503,phase:'fs_read'});
 }});
 const read=await api.fetch(request('/v1/orders/get',{id,readOnly:false}),{});
 const write=await api.fetch(request('/v1/transition',{id,uid:'guest',readOnly:true}),{});
 assert.deepEqual(modes,[true,false]);assert.equal(read.status,503);assert.equal(write.status,503);
 assert.match(read.headers.get('Server-Timing'),/failure_fs_read;dur=0/);
 assert.deepEqual(await write.json(),{error:'unavailable'});
});
