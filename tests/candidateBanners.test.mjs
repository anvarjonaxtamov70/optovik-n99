import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateBannerCache,candidateHomeBanners,readBanners} from '../src/domain/content.ts';
import {publicBannerSnapshot,listBanners,mutateBanner,syntheticDatasetRunner} from '../backend/firestore-isolation.mjs';
import {paths} from '../backend/firestore-orders.mjs';
const id='-AAAAAAAAAAAAAAAAAAA',banner={title:{uz:'TEST',ru:'TEST'},text:{uz:'',ru:''},cta:{uz:'Go',ru:'Go'},link:'sale',theme:'brand',order:0,active:true};
test('active custom sale banner stays visible even without discounted products',()=>{
 const raw={ [id]:banner };
 const result=candidateHomeBanners(readBanners(candidateBannerCache(raw,true)),[{narxi:100,qoldiq:1}]);
 assert.equal(result.length,1);assert.equal(result[0].id,id);
});
test('defaults are distinct from all custom banners disabled; inactive content stays private',()=>{
 assert.deepEqual(publicBannerSnapshot(null),{banners:{},bannersConfigured:false});
 const disabled=publicBannerSnapshot({[id]:{...banner,active:false}});
 assert.deepEqual(disabled,{banners:{},bannersConfigured:true});
 assert.deepEqual(candidateHomeBanners(readBanners(candidateBannerCache(disabled.banners,true)),[]),[]);
 assert.equal(candidateBannerCache({},false),null);
 assert.equal(candidateBannerCache({},undefined),null);
 assert.ok(candidateHomeBanners(null,[]).length>0);
 assert.throws(()=>candidateBannerCache({[id]:banner},false));
});
test('candidate banner mutations and read permissions survive batched dataset guard',async()=>{
 const docs=new Map([[paths.dataset,{kind:'synthetic-only',version:1}],[paths.admin('admin'),true],[paths.banners,{}]]);
 const batches=[];
 const run=syntheticDatasetRunner(async task=>task({get:async p=>docs.get(p)??null,getAll:async ps=>{batches.push(ps);return ps.map(p=>docs.get(p)??null);},set:(p,v)=>docs.set(p,v)}));
 await assert.rejects(mutateBanner(run,'guest',{id,action:'save',banner}),/forbidden/);
 await mutateBanner(run,'admin',{id,action:'save',banner});
 assert.deepEqual(batches.at(-1),[paths.dataset,paths.admin('admin'),paths.banners]);
 assert.equal((await listBanners(run,'guest')).banners[id].title.uz,'TEST');
 await mutateBanner(run,'admin',{id,action:'save',banner:{...banner,active:false}});
 assert.deepEqual(await listBanners(run,'guest'),{banners:{},bannersConfigured:true});
 await assert.rejects(listBanners(run,'guest',true),/forbidden/);
 assert.equal((await listBanners(run,'admin',true)).banners[id].active,false);
 await mutateBanner(run,'admin',{id,action:'delete'});
 assert.deepEqual(await listBanners(run,'guest'),{banners:{},bannersConfigured:false});
});

test('real API route lifecycle exposes only active banners to customer',async()=>{
 const {createFirestoreApi}=await import('../backend/firestore-api.mjs');
 const docs=new Map([[paths.dataset,{kind:'synthetic-only',version:1}],[paths.admin('admin'),true],[paths.banners,{}]]);
 const api=createFirestoreApi({enabled:()=>true,authenticate:async req=>req.headers.get('Authorization'),runner:async()=>syntheticDatasetRunner(async task=>{
  const writes=new Map();const value=await task({get:async p=>docs.get(p)??null,getAll:async ps=>ps.map(p=>docs.get(p)??null),set:(p,v)=>writes.set(p,v)});for(const [p,v] of writes)docs.set(p,v);return value;
 })});
 const call=async(path,body,actor='guest')=>api.fetch(new Request('https://test.invalid'+path,{method:'POST',headers:{Authorization:actor,'Content-Type':'application/json'},body:JSON.stringify(body)}),{});
 assert.equal((await call('/v1/admin/banner',{id,action:'save',banner})).status,403);
 assert.equal((await call('/v1/admin/banner',{id,action:'save',banner},'admin')).status,200);
 assert.equal((await (await call('/v1/banners/list',{})).json()).banners[id].title.uz,'TEST');
 assert.equal((await call('/v1/admin/banner',{id,action:'save',banner:{...banner,active:false}},'admin')).status,200);
 assert.deepEqual(await (await call('/v1/banners/list',{})).json(),{banners:{},bannersConfigured:true});
 assert.equal((await call('/v1/admin/banners/list',{})).status,403);
 assert.equal((await (await call('/v1/admin/banners/list',{},'admin')).json()).banners[id].active,false);
 assert.equal((await call('/v1/admin/banner',{id,action:'delete'},'admin')).status,200);
 assert.deepEqual(await (await call('/v1/banners/list',{})).json(),{banners:{},bannersConfigured:false});
});
