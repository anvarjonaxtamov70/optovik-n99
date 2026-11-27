import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {sealBackup,openBackup,parseBackupKey} from '../scripts/backup-crypto.mjs';
import {syntheticSeed,syntheticSeedCommit} from '../backend/firestore-seed.mjs';
import {syntheticDatasetRunner,listBanners,mutateBanner} from '../backend/firestore-isolation.mjs';
import {paths} from '../backend/firestore-orders.mjs';
const admin='syntheticAdmin',id='-AAAAAAAAAAAAAAAAAAA';
const snapshot=()=>Buffer.from(JSON.stringify({tovarlar:{a:{b:{nomi:'Synthetic',narxi:1,qoldiq:2}}}}));
test('backup envelope encrypts and verifies a valid JSON export without exposing plaintext',()=>{
 const key=randomBytes(32),raw=snapshot(),envelope=sealBackup(raw,key);
 assert.equal(envelope.includes(raw),false);
 assert.deepEqual(openBackup(envelope,key).bytes,raw);
 assert.equal(openBackup(envelope,key).counts.products,1);
 assert.notDeepEqual(sealBackup(raw,key),envelope);
});
test('encrypted backup rejects wrong key, corruption, invalid source and malformed key',()=>{
 const key=randomBytes(32),envelope=sealBackup(snapshot(),key);
 assert.throws(()=>openBackup(envelope,randomBytes(32)));
 envelope[envelope.length-1]^=1;
 assert.throws(()=>openBackup(envelope,key));
 assert.throws(()=>sealBackup(Buffer.from('{}'),key));
 assert.deepEqual(parseBackupKey(key.toString('base64')),key);
 assert.throws(()=>parseBackupKey('invalid'));
});
function fake(seed){
 const db=new Map(seed);
 return {db,run:task=>task({get:async p=>structuredClone(db.get(p)??null),set:(p,v)=>db.set(p,structuredClone(v))})};
}
test('synthetic seed uses fixed staging path and create-only preconditions',()=>{
 const seed=syntheticSeedCommit(admin);
 assert.equal(seed.writes.length,6);
 assert.ok(seed.writes.every(w=>w.currentDocument.exists===false&&w.update.name.startsWith('projects/optovik-n99-staging/')));
 assert.throws(()=>syntheticSeedCommit('bad/path'));
});
test('candidate operations require exact dataset marker',async()=>{
 const f=fake([]);
 let calls=0;
 const run=syntheticDatasetRunner(f.run);
 await assert.rejects(run(async()=>{calls++;}),/dataset-unavailable/);
 f.db.set(paths.dataset,{kind:'synthetic-only',version:2});
 await assert.rejects(run(async()=>{calls++;}),/dataset-unavailable/);
 assert.equal(calls,0);
 f.db.set(paths.dataset,{kind:'synthetic-only',version:1});
 await run(async()=>{calls++;});
 assert.equal(calls,1);
});
test('candidate banner admin write and inactive visibility are isolated',async()=>{
 const f=fake(syntheticSeed(admin)),run=syntheticDatasetRunner(f.run);
 const banner={title:{uz:'Test',ru:'Test'},text:{uz:'',ru:''},cta:{uz:'Go',ru:'Go'},link:'catalog',theme:'brand',order:0,active:false};
 await assert.rejects(mutateBanner(run,'guest',{id,action:'save',banner}),/forbidden/);
 await mutateBanner(run,admin,{id,action:'save',banner});
 assert.deepEqual((await listBanners(run,'guest')).banners,{});
 assert.equal((await listBanners(run,admin,true)).banners[id].active,false);
 await assert.rejects(mutateBanner(run,admin,{id,action:'save',banner:{...banner,link:'javascript:bad'}}),/invalid-banner/);
 await mutateBanner(run,admin,{id,action:'delete'});
 assert.deepEqual((await listBanners(run,admin,true)).banners,{});
});
