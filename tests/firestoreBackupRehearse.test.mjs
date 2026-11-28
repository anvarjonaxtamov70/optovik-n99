import test from 'node:test';
import assert from 'node:assert/strict';
import {syntheticSeed} from '../backend/firestore-seed.mjs';
import {makeCandidateBackup} from '../scripts/firestore-backup-format.mjs';
import {rehearseCandidate} from '../scripts/firestore-backup-rehearse.mjs';
const snapshot=()=>makeCandidateBackup(syntheticSeed('synthetic-admin'));
const namespace='demo-n99-restore-0123456789ab';
function mock({corrupt=false}={}){
 const db=new Map(),calls=[];
 return {calls,fetcher:async(url,options)=>{
  calls.push(url);assert.ok(url.startsWith('http://127.0.0.1:8080/v1/projects/'+namespace+'/'));
  assert.equal(options.redirect,'error');assert.equal(options.headers.Authorization,'Bearer owner');
  const body=JSON.parse(options.body);
  if(url.endsWith(':commit')){
   for(const w of body.writes){assert.equal(w.currentDocument.exists,false);if(db.has(w.update.name))return new Response('',{status:409});}
   for(const w of body.writes)db.set(w.update.name,w.update);
   return Response.json({writeResults:body.writes.map(()=>({}))});
  }
  return Response.json(body.documents.map((name,i)=>({found:corrupt&&i===0?{...db.get(name),fields:{}}:db.get(name)})));
 }};
}
test('restore tool uses create-only local writes and verifies every field',async()=>{
 const f=mock(),s=snapshot(),options={host:'127.0.0.1:8080',namespace,fetcher:f.fetcher};
 const result=await rehearseCandidate(s,options);
 assert.equal(result.restored,s.documents.length);assert.equal(result.verified,s.documents.length);
 await assert.rejects(rehearseCandidate(s,options),/failed/);
});
test('restore rejects remote hosts and real project names before any network call',async()=>{
 const f=mock();
 for(const options of [{host:'firestore.googleapis.com',namespace},{host:'127.0.0.1:8080',namespace:'optovik-n99-staging'},{host:'localhost:8081',namespace}]){
  await assert.rejects(rehearseCandidate(snapshot(),{...options,fetcher:f.fetcher}));
 }
 assert.equal(f.calls.length,0);
});
test('restore rejects corrupted emulator readback',async()=>{
 const f=mock({corrupt:true});
 await assert.rejects(rehearseCandidate(snapshot(),{host:'localhost:8080',namespace,fetcher:f.fetcher}),/failed/);
});
