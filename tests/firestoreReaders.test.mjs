import test from 'node:test';
import assert from 'node:assert/strict';
import {listFirestoreOrders,listFirestoreProducts} from '../backend/firestore-readers.mjs';
import {paths} from '../backend/firestore-orders.mjs';
const uid='guest',id='-AAAAAAAAAAAAAAAAAAA',second='-BBBBBBBBBBBBBBBBBBB',now=1800000000000;
function fixture(rows,admin=false){
 const queries=[];
 return {queries,run:task=>task({get:async()=>admin,reference:p=>'projects/demo/databases/(default)/documents/'+p,query:async q=>{queries.push(q);return rows;}})};
}
const order=(id,owner=uid)=>({path:paths.order(id),value:{index:{uid:owner,createdAt:now,holat:'yangi'},order:{createdAt:now,holat:'yangi',private:'synthetic'}}});
test('customer orders filter on actor and paginate with stable time and ID cursor',async()=>{
 const f=fixture([order(second),order(id)]);
 const page=await listFirestoreOrders(f.run,uid,{limit:1});
 assert.equal(page.items.length,1);
 assert.deepEqual(page.next,{id:second,createdAt:now});
 assert.equal(f.queries[0].where.fieldFilter.value.stringValue,uid);
 await listFirestoreOrders(f.run,uid,{limit:1,cursor:page.next});
 assert.equal(f.queries[1].startAt.before,false);
 assert.ok(f.queries[1].startAt.values[1].referenceValue.endsWith(second));
});
test('admin list requires server role and returns index only; mismatched owner rejected',async()=>{
 const f=fixture([order(id,'other')]);
 await assert.rejects(listFirestoreOrders(f.run,uid,{admin:true}),/forbidden/);
 assert.equal(f.queries.length,0);
 await assert.rejects(listFirestoreOrders(f.run,uid),/invalid-order-owner/);
 const privileged=fixture([order(id,'other')],true);
 const result=await listFirestoreOrders(privileged.run,'admin',{admin:true});
 assert.equal(result.items[0].data.private,undefined);
});
test('catalog query filters archive and validates bounded cursor',async()=>{
 const a=paths.product('optika','a'),b=paths.product('optika','b');
 const f=fixture([a,b].map(path=>({path,value:{nomi:'Synthetic',narxi:100,qoldiq:1}})));
 const page=await listFirestoreProducts(f.run,{limit:1});
 assert.equal(page.next,a);
 assert.equal(f.queries[0].where.fieldFilter.value.booleanValue,false);
 await assert.rejects(listFirestoreProducts(f.run,{cursor:'n99Orders/'+id}),/invalid-product-path/);
 await assert.rejects(listFirestoreProducts(f.run,{limit:41}),/invalid-limit/);
 const invalid=fixture([{path:a,value:{nomi:'Synthetic',narxi:100,qoldiq:1,archived:true}}]);
 await assert.rejects(listFirestoreProducts(invalid.run),/invalid-product-data/);
});

test('customer list strips staff note without modifying the stored order',async()=>{
 const row=order(id);row.value.order.adminIzoh='Internal only';
 const result=await listFirestoreOrders(fixture([row]).run,uid);
 assert.equal(result.items[0].data.adminIzoh,undefined);
 assert.equal(row.value.order.adminIzoh,'Internal only');
});
