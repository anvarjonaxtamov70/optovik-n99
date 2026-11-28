import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateBackendEnabled,collectPages,stagingAppName,CANDIDATE_CATALOG_CAP,CANDIDATE_CATALOG_REFRESH_MS} from '../src/domain/candidateBackend.ts';
import {publicSettings,readQuote,saveProfile,saveShop} from '../backend/firestore-aux.mjs';
import {paths} from '../backend/firestore-orders.mjs';
test('candidate selection fails closed outside exact staging',()=>{
 assert.equal(candidateBackendEnabled('worker','staging','optovik-n99-staging',undefined),false);
 assert.equal(candidateBackendEnabled('firestore-candidate','staging','optovik-n99-staging',undefined),true);
 for(const args of [['firestore-candidate','production','optovik-n99-staging',undefined],['firestore-candidate','staging','other',undefined],['firestore-candidate','staging','optovik-n99-staging','localhost']])assert.throws(()=>candidateBackendEnabled(...args),/staging only/);
});
test('catalog pagination rejects truncated and repeated cursor results',async()=>{
 assert.deepEqual(await collectPages(async c=>c===null?{items:[1],next:'a'}:{items:[2],next:null},3,true),[1,2]);
 await assert.rejects(collectPages(async()=>({items:[1],next:'a'}),3,true),/Invalid cursor/);
 await assert.rejects(collectPages(async()=>({items:[1],next:'a'}),1,true),/exceeds/);
 assert.deepEqual(await collectPages(async()=>({items:[1],next:'a'}),1,false),[1]);
});
const settings={pickupEnabled:true,courierEnabled:true,courierFee:0,freeDeliveryFrom:0};
test('public settings never disclose private legacy media keys',()=>{
 assert.deepEqual(publicSettings({...settings,imgbbApiKey:'synthetic',cloudinaryPreset:'synthetic'}),settings);
});
test('quote and profile preserve rate state and reject unknown fields',async()=>{
 const db=new Map([[paths.settings,settings],[paths.product('a','b'),{narxi:100,qoldiq:1}],[paths.customer('guest'),{lastOrderAt:42}]]);
 const run=task=>task({get:async k=>db.get(k)??null,set:(k,v)=>db.set(k,v)});
 const quote=await readQuote(run,['a/b']);assert.equal(quote.products[0].data.qoldiq,1);
 await assert.rejects(readQuote(run,['a/b','a/b']),/invalid-cart/);
 await saveProfile(run,'guest',{name:'Synthetic',phone:'+998900000000',address:'',apartment:'',landmark:''},43);
 assert.equal(db.get(paths.customer('guest')).lastOrderAt,42);
 await assert.rejects(saveProfile(run,'guest',{uid:'other'},43),/invalid-request/);
 await assert.rejects(saveShop(run,'guest',settings),/forbidden/);
});

test('candidate uses a separate auth persistence name and a bounded trial catalog',()=>{
 assert.equal(stagingAppName('optovik-n99-staging',false),'n99-staging-optovik-n99-staging');
 assert.notEqual(stagingAppName('optovik-n99-staging',true),stagingAppName('optovik-n99-staging',false));
 assert.equal(CANDIDATE_CATALOG_CAP,100);
 assert.equal(CANDIDATE_CATALOG_REFRESH_MS,300000);
});
