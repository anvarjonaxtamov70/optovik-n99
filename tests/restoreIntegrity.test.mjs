import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrder, transition } from '../backend/staging-worker.mjs';
import { verifyRestore } from '../scripts/restore-integrity.mjs';
const id='-AAAAAAAAAAAAAAAAAAA';
const snapshot=()=>{
  const root={admins:{admin:true},tovarlar:{optika:{fara:{nomi:'Synthetic',narxi:100,qoldiq:2}}},settings:{shop:{courierEnabled:true,pickupEnabled:true,courierFee:0,freeDeliveryFrom:0}}};
  createOrder(root,'testuser',{id,raqam:123456,order:{mijoz:{ism:'Test',telefon:'+998900000000'},yetkazish:{turi:'olib'},tolov:'naqd',til:'uz',platforma:'ios',items:{optika:{fara:{narxi:100,soni:1}}},summa:100,jami:100,soni:1,yetkazishNarxi:0}},1800000000000);
  return root;
};
test('synthetic backup roundtrip preserves order index and inventory lifecycle',()=>{
  const source=snapshot();
  transition(source,'admin',{uid:'testuser',id,expected:'yangi',next:'tasdiqlandi'},1800000000001);
  const restored=JSON.parse(JSON.stringify(source));
  assert.deepEqual(verifyRestore(restored),{products:1,orders:1,linked:1});
  transition(restored,'admin',{uid:'testuser',id,expected:'tasdiqlandi',next:'bekor'},1800000000002);
  assert.equal(restored.tovarlar.optika.fara.qoldiq,2);
  assert.equal(source.tovarlar.optika.fara.qoldiq,1);
});
test('restore verifier identifies incomplete snapshots without disclosing values',()=>{
  const root=snapshot();delete root.orderIndex[id];assert.throws(()=>verifyRestore(root),/index mismatch/);
  const other=snapshot();other.orders.testuser[id].jami=0;other.orderIndex[id].jami=0;assert.throws(()=>verifyRestore(other),/total mismatch/);
});
