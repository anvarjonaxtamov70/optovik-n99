import test from 'node:test';
import assert from 'node:assert/strict';
import {withStudioRoute,STUDIO_PATH} from '../backend/product-studio-http.mjs';
import {STUDIO_PNG_LIMITS} from '../backend/product-studio-png.mjs';
import {deflateSync} from 'node:zlib';
function chunk(name,bytes=Buffer.alloc(0)){
 const b=Buffer.concat([Buffer.from(name),bytes]);let crc=0xffffffff;
 for(const x of b){crc^=x;for(let i=0;i<8;i++)crc=(crc&1)?(crc>>>1)^0xedb88320:crc>>>1;}
 const len=Buffer.alloc(4),end=Buffer.alloc(4);len.writeUInt32BE(bytes.length);end.writeUInt32BE((crc^0xffffffff)>>>0);
 return Buffer.concat([len,b,end]);
}
const h=Buffer.alloc(13);h.writeUInt32BE(1);h.writeUInt32BE(1,4);h[8]=8;h[9]=6;
const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',h),chunk('tEXt',Buffer.from('private')),chunk('IDAT',deflateSync(Buffer.from([0,1,2,3,255]))),chunk('IEND')]);
const env={N99_STUDIO_ENABLED:'enabled',N99_STUDIO_FREE_PROJECT_CONFIRMED:'yes',N99_STUDIO_GEMINI_KEY:'test-secret'};
function fixture(overrides={}){
 const data=new Map([['n99Admins/admin',true]]);let calls=0,auth=0,delegated=0;
 const run=async task=>{const writes=new Map();const value=await task({get:async k=>data.get(k)??null,getAll:async keys=>keys.map(k=>data.get(k)??null),set:(k,v)=>writes.set(k,v)});for(const [k,v] of writes)data.set(k,v);return value;};
 const api=withStudioRoute({fallback:{fetch:()=>{delegated++;return new Response('existing');}},enabled:()=>true,authenticate:async req=>{auth++;return req.headers.get('Authorization')==='Bearer admin'?'admin':req.headers.get('Authorization')==='Bearer guest'?'guest':null;},runner:async()=>run,clock:()=>1800000000000,providerFactory:cfg=>async decoded=>{calls++;assert.equal(cfg.apiKey,'test-secret');assert.equal(decoded.meta.width,1);assert.equal(Buffer.from(decoded.bytes).includes(Buffer.from('private')),false);return {nomi:'Filtr',requiresReview:true};},...overrides});
 return {api,data,counts:()=>({calls,auth,delegated})};
}
function req(body=png,headers={},method='POST',path=STUDIO_PATH){
 return new Request('https://example.test'+path,{method,headers:{Authorization:'Bearer admin','Content-Type':'image/png',...headers},...(method==='POST'?{body}: {})});
}
test('existing routes are delegated and studio defaults to disabled',async()=>{
 const f=fixture();
 assert.equal(await (await f.api.fetch(req(png,{},'POST','/v1/orders'),{})).text(),'existing');
 assert.equal((await f.api.fetch(req(),{})).status,503);
 assert.equal((await f.api.fetch(req(),{...env,N99_STUDIO_FREE_PROJECT_CONFIRMED:'no'})).status,503);
 assert.equal((await fixture({enabled:()=>false}).api.fetch(req(),env)).status,503);
 assert.deepEqual(f.counts(),{calls:0,auth:0,delegated:1});
});
test('method and CORS preflight do not contact provider',async()=>{
 const f=fixture();
 assert.equal((await f.api.fetch(req(null,{},'GET'),env)).status,404);
 const res=await f.api.fetch(req(null,{},'OPTIONS'),env);
 assert.equal(res.status,204);assert.match(res.headers.get('Access-Control-Allow-Headers'),/Authorization/);
 assert.equal(f.counts().calls,0);
});
test('requires verified identity and stored admin role before provider',async()=>{
 const f=fixture();
 assert.equal((await f.api.fetch(req(png,{Authorization:'Bearer invalid'}),env)).status,401);
 assert.equal((await f.api.fetch(req(png,{Authorization:'Bearer guest'}),env)).status,403);
 assert.equal(f.counts().calls,0);assert.equal(f.data.size,1);
});
test('rejects incorrect media, compressed transport and oversized lengths',async()=>{
 const f=fixture();
 for(const [headers,status] of [[{'Content-Type':'image/jpeg'},415],[{'Content-Encoding':'gzip'},415],[{'Content-Length':String(STUDIO_PNG_LIMITS.maxBytes+1)},413],[{'Content-Length':'1'},413]])assert.equal((await f.api.fetch(req(png,headers),env)).status,status);
 assert.equal((await f.api.fetch(req(new Uint8Array(STUDIO_PNG_LIMITS.maxBytes+1)),env)).status,413);
 assert.equal(f.counts().calls,0);
});
test('sanitizes a real PNG, reserves quota, returns draft only and rejects repeat',async()=>{
 const f=fixture();const res=await f.api.fetch(req(),env);
 assert.equal(res.status,200);assert.equal(res.headers.get('Cache-Control'),'no-store');
 assert.deepEqual(await res.json(),{draft:{nomi:'Filtr',requiresReview:true},quota:{remainingGlobal:19,remainingAdmin:4}});
 assert.equal((await f.api.fetch(req(),env)).status,429);assert.equal(f.counts().calls,1);
 assert.deepEqual([...f.data.keys()].sort(),['n99Admins/admin','n99StudioQuota/admin_admin','n99StudioQuota/global']);
});
test('bad PNG is rejected without quota reservation',async()=>{
 const f=fixture(),bad=Buffer.from(png);bad[29]^=1;
 assert.equal((await f.api.fetch(req(bad),env)).status,400);
 assert.equal(f.data.size,1);assert.equal(f.counts().calls,0);
});
test('provider errors return only allowlisted codes and attempts remain counted',async()=>{
 const f=fixture({providerFactory:()=>async()=>{throw Object.assign(new Error('secret token upstream'),{code:'provider-quota'});}});
 const res=await f.api.fetch(req(),env);assert.equal(res.status,429);assert.deepEqual(await res.json(),{error:'provider-quota'});
 assert.equal((await f.api.fetch(req(),env)).status,429);
 const g=fixture({providerFactory:()=>async()=>{throw new Error('test-secret');}});
 assert.deepEqual(await (await g.api.fetch(req(),env)).json(),{error:'studio-unavailable'});
});
