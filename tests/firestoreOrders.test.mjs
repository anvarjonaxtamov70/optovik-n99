import test from 'node:test';
import assert from 'node:assert/strict';
import {executeFirestoreOrder,paths} from '../backend/firestore-orders.mjs';
import {firestoreRunner} from '../backend/firestore-rest.mjs';
const uid='guest',admin='admin',id='-AAAAAAAAAAAAAAAAAAA',now=1800000000000;
const fixture=()=>new Map([[paths.admin(admin),true],[paths.settings,{pickupEnabled:true,courierEnabled:true,courierFee:0,freeDeliveryFrom:0}],[paths.product('optika','fara'),{nomi:'Synthetic',narxi:100,qoldiq:1,revision:1}]]);
const order=()=>({id,raqam:123456,order:{mijoz:{ism:'Synthetic',telefon:'+998900000000'},yetkazish:{turi:'olib'},tolov:'naqd',til:'uz',platforma:'ios',items:{optika:{fara:{narxi:100,soni:1}}},summa:100,jami:100,soni:1,yetkazishNarxi:0}});
function fake(initial){
 const data=initial, reads=[];
 return {data,reads,run:async task=>{
   const writes=new Map();
   const result=await task({get:async path=>{assert.equal(writes.size,0);reads.push(path);return structuredClone(data.get(path)??null);},set:(path,value)=>writes.set(path,structuredClone(value))});
   for(const [path,v] of writes)data.set(path,v);
   return result;
 }};
}
test('document adapter performs lifecycle without scanning unrelated catalog',async()=>{
 const f=fake(fixture());
 for(let i=0;i<1000;i++)f.data.set(paths.product('bulk','p'+i),{qoldiq:10});
 const run=(op,actor,body,time)=>executeFirestoreOrder(f.run,op,actor,body,time);
 assert.equal((await run('create',uid,order(),now)).recovered,false);
 assert.equal((await run('create',uid,order(),now+1)).recovered,true);
 await run('change',admin,{uid,id,expected:'yangi',next:'tasdiqlandi'},now+2);
 assert.equal(f.data.get(paths.product('optika','fara')).qoldiq,0);
 await run('change',admin,{uid,id,expected:'tasdiqlandi',next:'bekor'},now+3);
 await run('change',admin,{uid,id,expected:'tasdiqlandi',next:'bekor'},now+4);
 assert.equal(f.data.get(paths.product('optika','fara')).qoldiq,1);
 assert.equal(f.data.get(paths.order(id)).index.holat,'bekor');
 assert.ok(f.reads.every(path=>!path.includes('/bulk/')));
});
test('document adapter rejects stale quote and keeps closed attempt marker',async()=>{
 const f=fake(fixture()),b=order();
 b.order.jami=99;
 await assert.rejects(executeFirestoreOrder(f.run,'create',uid,b,now),/quote-changed/);
 assert.equal(f.data.has(paths.order(id)),false);
 assert.equal((await executeFirestoreOrder(f.run,'abandon',uid,b,now)).outcome,'abandoned');
 await assert.rejects(executeFirestoreOrder(f.run,'create',uid,order(),now+1),/order-abandoned/);
 assert.equal(f.data.has(paths.order(id)),false);
});
test('document adapter reports existing order without altering inventory on closure',async()=>{
 const f=fake(fixture());
 await executeFirestoreOrder(f.run,'create',uid,order(),now);
 assert.equal((await executeFirestoreOrder(f.run,'abandon',uid,order(),now+1)).outcome,'exists');
 assert.equal(f.data.get(paths.order(id)).order.holat,'yangi');
 assert.equal(f.data.has(paths.abandoned(uid)),false);
});
const response=(body,status=200)=>Response.json(body,{status});
test('REST runner reads and commits bounded document writes in a single transaction',async()=>{
 const calls=[];
 const run=firestoreRunner({token:'synthetic',deadline:10000,clock:()=>0,fetcher:async(url,options)=>{
  calls.push({url,options});
  if(url.endsWith(':beginTransaction'))return response({transaction:'tx1'});
  if(url.includes('?transaction='))return response({},404);
  if(url.endsWith(':commit'))return response({});
  throw new Error('unexpected request');
 }});
 await run(async tx=>{assert.equal(await tx.get(paths.order(id)),null);tx.set(paths.order(id),{synthetic:true});return true;});
 assert.equal(calls.length,3);
 const commit=JSON.parse(calls[2].options.body);
 assert.equal(commit.transaction,'tx1');
 assert.equal(commit.writes.length,1);
 assert.equal(JSON.parse(commit.writes[0].update.fields.payload.stringValue).synthetic,true);
});
test('REST runner retries explicit aborted commit but not unknown commit outcome',async()=>{
 let starts=0,commits=0;
 const run=firestoreRunner({token:'synthetic',deadline:10000,clock:()=>0,fetcher:async(url)=>{
   if(url.endsWith(':beginTransaction'))return response({transaction:'tx'+(++starts)});
   if(url.endsWith(':rollback'))return response({});
   if(url.endsWith(':commit')){commits++;return commits===1?response({error:{status:'ABORTED'}},409):response({});}
   throw new Error('unexpected request');
 }});
 await run(async tx=>{tx.set(paths.order(id),{x:1});});
 assert.equal(starts,2);assert.equal(commits,2);
 starts=0;commits=0;
 const unknown=firestoreRunner({token:'synthetic',deadline:10000,clock:()=>0,fetcher:async(url)=>{
   if(url.endsWith(':beginTransaction')){starts++;return response({transaction:'tx'});}
   if(url.endsWith(':commit')){commits++;throw new Error('lost response');}
   throw new Error('unexpected request');
 }});
 await assert.rejects(unknown(async tx=>tx.set(paths.order(id),{x:1})),/lost response/);
 assert.equal(starts,1);assert.equal(commits,1);
});
