import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {syntheticSeed} from '../backend/firestore-seed.mjs';
import {paths,executeFirestoreOrder} from '../backend/firestore-orders.mjs';
import {makeCandidateBackup,verifyCandidateBackup} from '../scripts/firestore-backup-format.mjs';
import {sealBackup,openBackup} from '../scripts/backup-crypto.mjs';
const id='-HHHHHHHHHHHHHHHHHHH',uid='backup-customer',admin='testadmin',now=1800000000000;
const makeRun=db=>async task=>{
 const writes=new Map();
 const result=await task({get:async p=>structuredClone(db.get(p)??null),getAll:async ps=>ps.map(p=>structuredClone(db.get(p)??null)),set:(p,v)=>writes.set(p,structuredClone(v))});
 for(const [p,v] of writes)db.set(p,v);return result;
};
async function fixture(){
 const db=syntheticSeed(admin),run=makeRun(db);
 await executeFirestoreOrder(run,'create',uid,{id,raqam:123456,order:{mijoz:{ism:'Synthetic',telefon:'+998900000000'},yetkazish:{turi:'olib'},tolov:'naqd',til:'uz',platforma:'ios',items:{optika:{'synthetic-fara':{narxi:100000,soni:1}}},summa:100000,jami:100000,soni:1,yetkazishNarxi:0}},now);
 await executeFirestoreOrder(run,'change',admin,{uid,id,expected:'yangi',next:'tasdiqlandi'},now+1);
 return db;
}
test('encrypted Firestore snapshot preserves all documents and reserved stock on offline replay',async()=>{
 const db=await fixture(),snapshot=makeCandidateBackup(db),key=randomBytes(32);
 const bytes=Buffer.from(JSON.stringify(snapshot)),sealed=sealBackup(bytes,key);
 const opened=openBackup(sealed,key);
 assert.deepEqual(opened.bytes,bytes);
 assert.equal(opened.counts.orders,1);assert.equal(opened.counts.documents,db.size);
 const restored=new Map(JSON.parse(opened.bytes.toString()).documents.map(d=>[d.path,d.value]));
 assert.deepEqual(restored,db);
 await executeFirestoreOrder(makeRun(restored),'change',admin,{uid,id,expected:'tasdiqlandi',next:'bekor'},now+2);
 const product=paths.product('optika','synthetic-fara');
 assert.equal(restored.get(product).qoldiq,6);assert.equal(db.get(product).qoldiq,5);
 assert.throws(()=>openBackup(sealed,randomBytes(32)));
 sealed[sealed.length-1]^=1;assert.throws(()=>openBackup(sealed,key));
});
test('candidate backup rejects missing marker, repeated paths, unsupported documents and missing reserved inventory',async()=>{
 const db=await fixture(),snapshot=makeCandidateBackup(db);
 for(const path of [paths.dataset,paths.settings,paths.banners,paths.product('optika','synthetic-fara')]){
  const copy=structuredClone(snapshot);copy.documents=copy.documents.filter(d=>d.path!==path);assert.throws(()=>verifyCandidateBackup(copy));
 }
 const duplicate=structuredClone(snapshot);duplicate.documents.push(duplicate.documents[0]);assert.throws(()=>verifyCandidateBackup(duplicate));
 const unknown=structuredClone(snapshot);unknown.documents.push({path:'n99Other/test',value:{}});assert.throws(()=>verifyCandidateBackup(unknown));
 const wrongProject=structuredClone(snapshot);wrongProject.project='production';assert.throws(()=>verifyCandidateBackup(wrongProject));
});
