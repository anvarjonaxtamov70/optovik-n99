import test from 'node:test';
import assert from 'node:assert/strict';
import {planFirestoreImport} from '../backend/firestore-migration.mjs';
import {paths} from '../backend/firestore-orders.mjs';
import {documentFields,localFirestoreRunner,isLocalFirestoreHost} from '../backend/firestore-rest.mjs';
import {createOrder,transition} from '../backend/staging-worker.mjs';
const uid='synthetic',admin='testadmin',id='-AAAAAAAAAAAAAAAAAAA',now=1800000000000;
function fixture(){
 const root={admins:{[admin]:true},tovarlar:{optika:{fara:{nomi:'Synthetic',narxi:100,qoldiq:2,revision:1}}},settings:{shop:{pickupEnabled:true,courierEnabled:true,courierFee:0,freeDeliveryFrom:0}},banners:{demo:true}};
 createOrder(root,uid,{id,raqam:123456,order:{mijoz:{ism:'Synthetic',telefon:'+998900000000'},yetkazish:{turi:'olib'},tolov:'naqd',til:'uz',platforma:'ios',items:{optika:{fara:{narxi:100,soni:1}}},summa:100,jami:100,soni:1,yetkazishNarxi:0}},now);
 transition(root,admin,{uid,id,expected:'yangi',next:'tasdiqlandi'},now+1);
 return root;
}
test('migration preserves reserved stock, order index and rate state without mutating source',()=>{
 const root=fixture(),before=structuredClone(root);
 const result=planFirestoreImport(root);
 assert.deepEqual(root,before);
 assert.equal(result.docs.get(paths.product('optika','fara')).qoldiq,1);
 assert.equal(result.docs.get(paths.order(id)).index.holat,'tasdiqlandi');
 assert.equal(result.docs.get(paths.customer(uid)).lastOrderAt,now);
 assert.deepEqual(result.excludedRoots,['banners']);
});
test('migration rejects inconsistent index and closed-marker collision',()=>{
 let root=fixture();root.orderIndex[id].jami=999;
 assert.throws(()=>planFirestoreImport(root),/Order index mismatch/);
 root=fixture();root.abandonedOrders={[uid]:{[id]:{raqam:123456,at:now}}};
 assert.throws(()=>planFirestoreImport(root),/Invalid migration snapshot/);
});
test('query fields derive from authoritative order and product, not user supplied index fields',()=>{
 const root=fixture(),entry=planFirestoreImport(root).docs.get(paths.order(id));
 const fields=documentFields(paths.order(id),entry);
 assert.equal(fields.uid.stringValue,uid);
 assert.equal(fields.status.stringValue,'tasdiqlandi');
 assert.equal(fields.createdAt.integerValue,String(now));
 const product=documentFields(paths.product('optika','fara'),root.tovarlar.optika.fara);
 assert.equal(product.stock.integerValue,'1');
 assert.equal(product.archived.booleanValue,false);
});
test('local Firestore runner refuses non-local endpoints',()=>{
 for(const host of [undefined,'example.com:8080','127.0.0.1:9999','localhost:8080/extra'])assert.throws(()=>localFirestoreRunner({host,deadline:Date.now()+1000}),/local-emulator-required/);
});

test('local Firestore guard accepts only the two exact loopback endpoints',()=>{
 for(const host of ['127.0.0.1:8080','localhost:8080']){
  assert.equal(isLocalFirestoreHost(host),true);
  assert.equal(typeof localFirestoreRunner({host,deadline:Date.now()+1000}),'function');
 }
 for(const host of ['127x0x0x1:8080','127.0.0.1:8080/','http://localhost:8080','localhost:8081',null])assert.equal(isLocalFirestoreHost(host),false);
});
