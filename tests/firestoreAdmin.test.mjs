import test from 'node:test';
import assert from 'node:assert/strict';
import {paths,executeFirestoreOrder} from '../backend/firestore-orders.mjs';
import {mutateFirestoreProduct,saveFirestoreOrderNote,updateFirestoreDelivery,readFirestoreOrder} from '../backend/firestore-admin.mjs';
const admin='admin',uid='customer',id='-AAAAAAAAAAAAAAAAAAA',now=1800000000000;
const product=paths.product('optika','fara');
const fixture=()=>{
 const data=new Map([[paths.admin(admin),true],[paths.settings,{courierEnabled:true,pickupEnabled:true,courierFee:0,freeDeliveryFrom:0,name:'Synthetic'}],[product,{nomi:'Fara',narxi:100,eskiNarx:200,qoldiq:2,revision:1}]]);
 return {data,run:async task=>{
  const writes=new Map();
  const result=await task({get:async path=>{assert.equal(writes.size,0);return structuredClone(data.get(path)??null);},set:(path,value)=>writes.set(path,structuredClone(value))});
  for(const [path,value] of writes)data.set(path,value);return result;
 }};
};
const edit=(f,actor,action,expectedRevision,patch)=>mutateFirestoreProduct(f.run,actor,{cat:'optika',id:'fara',action,expectedRevision,patch},now);
const request=()=>({id,raqam:123456,order:{mijoz:{ism:'Synthetic',telefon:'+998900000000'},yetkazish:{turi:'olib'},tolov:'naqd',til:'uz',platforma:'ios',items:{optika:{fara:{narxi:100,soni:1}}},summa:100,soni:1,jami:100,yetkazishNarxi:0}});
test('admin quick price edit clears expired sale and rejects stale revision',async()=>{
 const f=fixture();
 await edit(f,admin,'quick',1,{narxi:200});
 assert.equal(f.data.get(product).revision,2);
 assert.equal(f.data.get(product).eskiNarx,undefined);
 await assert.rejects(edit(f,admin,'quick',1,{qoldiq:4}),/product-conflict/);
 assert.equal(f.data.get(product).qoldiq,2);
});
test('product writes reject non-admin, invalid fields and invalid values',async()=>{
 const f=fixture();
 await assert.rejects(edit(f,uid,'quick',1,{qoldiq:1}),/forbidden/);
 for(const patch of [{qoldiq:-1},{narxi:1000000001},{revision:99},{rasmlar:['http://example.test/a']},{nomi:''}]){
   await assert.rejects(edit(f,admin,'edit',1,patch),/invalid/);
 }
 assert.equal(f.data.get(product).revision,1);
});
test('archive preserves reserved inventory and rejects stale admin update after confirmation',async()=>{
 const f=fixture();
 await executeFirestoreOrder(f.run,'create',uid,request(),now);
 await executeFirestoreOrder(f.run,'change',admin,{uid,id,expected:'yangi',next:'tasdiqlandi'},now+1);
 await assert.rejects(edit(f,admin,'quick',1,{qoldiq:9}),/product-conflict/);
 await edit(f,admin,'archive',2);
 await assert.rejects(edit(f,admin,'edit',3,{qoldiq:4}),/product-archived/);
 await executeFirestoreOrder(f.run,'change',admin,{uid,id,expected:'tasdiqlandi',next:'bekor'},now+2);
 assert.equal(f.data.get(product).qoldiq,2);
 assert.equal(f.data.get(product).archived,true);
});
test('create requires absent product and initializes revision',async()=>{
 const f=fixture();
 await assert.rejects(edit(f,admin,'create',null,{nomi:'Other',narxi:100,qoldiq:2}),/product-conflict/);
 await mutateFirestoreProduct(f.run,admin,{cat:'optika',id:'new',action:'create',expectedRevision:null,patch:{nomi:'New',narxi:100,qoldiq:2}},now);
 assert.equal(f.data.get(paths.product('optika','new')).revision,1);
});
test('order notes and private order reads preserve access and order index',async()=>{
 const f=fixture();
 await executeFirestoreOrder(f.run,'create',uid,request(),now);
 const before=structuredClone(f.data.get(paths.order(id)).index);
 await assert.rejects(saveFirestoreOrderNote(f.run,uid,{id,uid,note:'test'}),/forbidden/);
 await assert.rejects(readFirestoreOrder(f.run,'other',id),/forbidden/);
 await saveFirestoreOrderNote(f.run,admin,{id,uid,note:'  Synthetic  '});
 assert.equal((await readFirestoreOrder(f.run,uid,id)).adminIzoh,undefined);
 assert.equal((await readFirestoreOrder(f.run,admin,id,uid)).adminIzoh,'Synthetic');
 assert.deepEqual(f.data.get(paths.order(id)).index,before);
});
test('delivery settings preserve other values and reject unknown fields',async()=>{
 const f=fixture();
 await updateFirestoreDelivery(f.run,admin,{courierFee:5000});
 assert.equal(f.data.get(paths.settings).name,'Synthetic');
 assert.equal(f.data.get(paths.settings).courierFee,5000);
 await assert.rejects(updateFirestoreDelivery(f.run,uid,{courierFee:0}),/forbidden/);
 await assert.rejects(updateFirestoreDelivery(f.run,admin,{imgbbApiKey:'synthetic'}),/invalid-settings/);
});

test('archive blocks a new reservation but leaves an unreserved order cancellable',async()=>{
 const f=fixture();
 await executeFirestoreOrder(f.run,'create',uid,request(),now);
 await edit(f,admin,'archive',1);
 await assert.rejects(executeFirestoreOrder(f.run,'change',admin,{uid,id,expected:'yangi',next:'tasdiqlandi'},now+1),/stock-unavailable/);
 assert.equal(f.data.get(product).qoldiq,2);
 assert.equal(f.data.get(paths.order(id)).order.holat,'yangi');
 await saveFirestoreOrderNote(f.run,admin,{uid,id,note:'Internal only'});
 const result=await executeFirestoreOrder(f.run,'change',uid,{uid,id,expected:'yangi',next:'bekor',includeOrder:true},now+2);
 assert.equal(result.order.adminIzoh,undefined);
 assert.equal(f.data.get(paths.order(id)).order.adminIzoh,'Internal only');
 assert.equal(f.data.get(product).qoldiq,2);
});
