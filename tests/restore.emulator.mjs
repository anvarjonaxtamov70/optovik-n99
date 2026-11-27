// Real local RTDB import/export rehearsal; synthetic data only, never a remote host.
import assert from 'node:assert/strict';
import test from 'node:test';
import { createOrder, transition } from '../backend/staging-worker.mjs';
import { verifyRestore } from '../scripts/restore-integrity.mjs';

const host=process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if(!/^(127\.0\.0\.1|localhost):9000$/.test(host??'')) throw new Error('Restore rehearsal requires the local database emulator');
const base='http://'+host;
const namespace='demo-n99-restore-default-rtdb';
const id='-AAAAAAAAAAAAAAAAAAA', uid='synthetic', admin='testadmin';
async function localDb(method,body) {
  const response=await fetch(base+'/.json?ns='+namespace,{
    method,headers:{Authorization:'Bearer owner','Content-Type':'application/json'},
    ...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(10000),
  });
  assert.equal(response.status,200,'Local restore operation failed');
  return response.json();
}
test('local emulator JSON backup and restore preserves order and inventory',async()=>{
  const snapshot={
    admins:{[admin]:true},
    tovarlar:{optika:{fara:{nomi:'Synthetic',narxi:100,qoldiq:2,revision:1}}},
    settings:{shop:{pickupEnabled:true,courierEnabled:true,courierFee:0,freeDeliveryFrom:0}},
  };
  createOrder(snapshot,uid,{id,raqam:123456,order:{mijoz:{ism:'Synthetic',telefon:'+998900000000'},yetkazish:{turi:'olib'},tolov:'naqd',til:'uz',platforma:'ios',items:{optika:{fara:{narxi:100,soni:1}}},summa:100,jami:100,soni:1,yetkazishNarxi:0}},1800000000000);
  transition(snapshot,admin,{uid,id,expected:'yangi',next:'tasdiqlandi'},1800000000001);
  try{
    await localDb('PUT',snapshot);
    const backup=JSON.stringify(await localDb('GET'));
    assert.deepEqual(verifyRestore(JSON.parse(backup)),{products:1,orders:1,linked:1});
    // Empty ONLY the explicitly named disposable local namespace.
    await localDb('PUT',null);
    assert.equal(await localDb('GET'),null);
    await localDb('PUT',JSON.parse(backup));
    const restored=await localDb('GET');
    assert.deepEqual(restored,snapshot);
    assert.equal(restored.tovarlar.optika.fara.qoldiq,1);
    transition(restored,admin,{uid,id,expected:'tasdiqlandi',next:'bekor'},1800000000002);
    await localDb('PUT',restored);
    const after=await localDb('GET');
    assert.equal(after.tovarlar.optika.fara.qoldiq,2);
    assert.deepEqual(verifyRestore(after),{products:1,orders:1,linked:1});
  }finally{await localDb('PUT',null);}
});
