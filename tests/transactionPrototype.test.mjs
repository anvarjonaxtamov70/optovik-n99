import test from 'node:test';
import assert from 'node:assert/strict';
import { TransactionPrototype } from '../backend/prototype/transaction-store.mjs';
const id='-AAAAAAAAAAAAAAAAAAA',id2='-BBBBBBBBBBBBBBBBBBB',now=1800000000000;
function setup(t){
  const db=new TransactionPrototype();t.after(()=>db.close());
  db.seedAdmin('admin');
  db.seedProduct('optika','fara',{nomi:'Synthetic',narxi:100,qoldiq:1,revision:1});
  db.seedProduct('optika','other',{nomi:'Other',narxi:200,qoldiq:10,revision:1});
  db.seedSettings({pickupEnabled:true,courierEnabled:true,courierFee:0,freeDeliveryFrom:0});
  return db;
}
function order(i=id){return {id:i,raqam:123456,order:{mijoz:{ism:'Synthetic',telefon:'+998900000000'},yetkazish:{turi:'olib'},tolov:'naqd',til:'uz',platforma:'ios',items:{optika:{fara:{narxi:100,soni:1}}},summa:100,jami:100,soni:1,yetkazishNarxi:0}};}
const change=(uid,id,expected,next)=>({uid,id,expected,next});
test('relational prototype uses unique order key and writes one event on replay',t=>{
  const db=setup(t);
  assert.equal(db.create('u1',order(),now).recovered,false);
  assert.equal(db.create('u1',order(),now+1).recovered,true);
  assert.throws(()=>db.create('u2',order(),now+1),/id-conflict/);
  assert.deepEqual(db.counts(),{orders:1,events:1});
});
test('relational prototype reserves only affected inventory and releases once',t=>{
  const db=setup(t);
  db.create('u1',order(),now);db.create('u2',order(id2),now);
  db.change('admin',change('u1',id,'yangi','tasdiqlandi'),now+1);
  assert.throws(()=>db.change('admin',change('u2',id2,'yangi','tasdiqlandi'),now+2),/stock-unavailable/);
  assert.equal(db.order(id2).holat,'yangi');
  assert.equal(db.product('optika','fara').qoldiq,0);
  assert.equal(db.product('optika','other').qoldiq,10);
  db.change('admin',change('u1',id,'tasdiqlandi','bekor'),now+3);
  db.change('admin',change('u1',id,'tasdiqlandi','bekor'),now+4);
  assert.equal(db.product('optika','fara').qoldiq,1);
  assert.deepEqual(db.counts(),{orders:2,events:4});
});
test('relational prototype rolls back a rejected order with no outbox event',t=>{
  const db=setup(t);const b=order();b.order.summa=1;
  assert.throws(()=>db.create('u1',b,now),/quote-changed/);
  assert.deepEqual(db.counts(),{orders:0,events:0});
  assert.equal(db.create('u1',order(),now).recovered,false);
});
