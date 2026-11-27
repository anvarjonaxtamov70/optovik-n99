import test from 'node:test';
import assert from 'node:assert/strict';
import { TransactionPrototype } from '../backend/prototype/transaction-store.mjs';
import { OrderIndexProjection } from '../backend/prototype/order-projection.mjs';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
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

test('outbox preserves historical order snapshots and projection ignores stale events',t=>{
  const db=setup(t);db.create('u1',order(),now);
  db.change('admin',change('u1',id,'yangi','tasdiqlandi'),now+1);
  db.change('admin',change('u1',id,'tasdiqlandi','bekor'),now+2);
  const events=db.eventsAfter(0,2);
  assert.deepEqual(events.map(e=>e.index.holat),['yangi','tasdiqlandi']);
  const [last]=db.eventsAfter(events[1].seq);
  const p=new OrderIndexProjection();
  assert.equal(p.apply(last),true);
  assert.equal(p.apply(events[0]),false);
  assert.equal(p.apply(last),false);
  assert.equal(p.get(id).holat,'bekor');
  assert.equal(db.eventsAfter(last.seq).length,0);
});
test('SQLite backup restores pending inventory and replay history in a fresh connection',async t=>{
  const db=setup(t);
  const dir=await mkdtemp(join(tmpdir(),'n99-synthetic-'));
  let restored;
  try{
    db.create('u1',order(),now);
    db.change('admin',change('u1',id,'yangi','tasdiqlandi'),now+1);
    const file=join(dir,'backup.sqlite');
    await db.backupTo(file);
    restored=new TransactionPrototype({filename:file});
    assert.equal(restored.product('optika','fara').qoldiq,0);
    assert.equal(restored.create('u1',order(),now+2).recovered,true);
    restored.change('admin',change('u1',id,'tasdiqlandi','bekor'),now+3);
    assert.equal(restored.product('optika','fara').qoldiq,1);
    assert.deepEqual(restored.counts(),{orders:1,events:3});
    assert.equal(db.product('optika','fara').qoldiq,0);
  }finally{restored?.close();await rm(dir,{recursive:true,force:true});}
});
test('synthetic workload keeps stock and event counts consistent with 1000 unrelated products',t=>{
  const db=setup(t);
  for(let i=0;i<1000;i++)db.seedProduct('bulk','p'+i,{nomi:'Synthetic',narxi:100,qoldiq:10});
  for(let i=0;i<100;i++){
    const oid='-'+String(i).padStart(19,'0'),uid='u'+i;
    db.create(uid,order(oid),now);
    db.change('admin',change(uid,oid,'yangi','tasdiqlandi'),now+1);
    db.change('admin',change(uid,oid,'tasdiqlandi','bekor'),now+2);
    assert.equal(db.create(uid,order(oid),now+3).recovered,true);
  }
  assert.deepEqual(db.counts(),{orders:100,events:300});
  assert.equal(db.product('optika','fara').qoldiq,1);
  assert.equal(db.product('bulk','p999').qoldiq,10);
  let seq=0,count=0;const projection=new OrderIndexProjection();
  for(;;){const page=db.eventsAfter(seq,100);if(!page.length)break;for(const event of page){projection.apply(event);seq=event.seq;count++;}}
  assert.equal(count,300);
  assert.equal(projection.get('-'+String(99).padStart(19,'0')).holat,'bekor');
});
