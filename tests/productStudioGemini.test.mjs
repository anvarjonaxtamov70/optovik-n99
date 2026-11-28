import test from 'node:test';
import assert from 'node:assert/strict';
import {createStudioGemini, STUDIO_MODEL} from '../backend/product-studio-gemini.mjs';

// Synthetic signature fixture. The future HTTP intake must fully decode real images.
const bytes = new Uint8Array([255,216,255,224,0,1]);
const image = {bytes,meta:{mime:'image/jpeg',bytes:bytes.length,width:100,height:100}};
const result = {nomi:'Moy filtri',brend:'GM',artikul:'123',modelSuggestion:'Cobalt',tavsifUz:'Moy filtri',tavsifRu:'Масляный фильтр'};
const ok = raw => new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(raw)}]}}]}));
const config = {apiKey:'test-key',enabled:true,freeProjectConfirmed:true};
const adapter = fetchImpl => createStudioGemini({...config,fetchImpl});
const rejectCode = (promise,code)=>assert.rejects(promise,{code});

test('Gemini adapter defaults to disabled and requires explicit unbilled project attestation',async()=>{
  let calls=0;
  const fetchImpl=async()=>{calls++;return ok(result);};
  for (const cfg of [{},{...config,enabled:false},{...config,freeProjectConfirmed:false},{...config,freeProjectConfirmed:'true'},{...config,apiKey:''}]) await rejectCode(createStudioGemini({...cfg,fetchImpl})(image),'studio-disabled');
  assert.equal(calls,0);
});
test('Gemini request is pinned, sends one inline image, no tools and no key in URL',async()=>{
  let calls=0;
  const run=adapter(async(url,req)=>{
    calls++;
    assert.equal(url,'https://generativelanguage.googleapis.com/v1beta/models/'+STUDIO_MODEL+':generateContent');
    assert.equal(req.headers['x-goog-api-key'],'test-key');
    assert.equal(req.redirect,'error');
    const body=JSON.parse(req.body);
    assert.equal(body.tools,undefined);
    assert.equal(body.contents.length,1);
    assert.equal(body.contents[0].parts[1].inlineData.data,Buffer.from(bytes).toString('base64'));
    assert.equal(body.generationConfig.responseFormat.text.mimeType,'APPLICATION_JSON');
    assert.equal(body.generationConfig.maxOutputTokens,2048);
    return ok({...result,narxi:1,qoldiq:500,requiresReview:false});
  });
  assert.deepEqual(await run(image),{...result,requiresReview:true});
  assert.equal(calls,1);
});
test('invalid metadata, mismatched bytes and fake signatures never reach provider',async()=>{
  let calls=0;
  const run=adapter(async()=>{calls++;return ok(result);});
  await rejectCode(run({...image,meta:{...image.meta,mime:'image/svg+xml'}}),'invalid-image-type');
  await rejectCode(run({...image,meta:{...image.meta,width:9000}}),'invalid-image-dimensions');
  await rejectCode(run({...image,meta:{...image.meta,bytes:99}}),'invalid-image-bytes');
  await rejectCode(run({...image,bytes:new Uint8Array(6)}),'invalid-image-bytes');
  assert.equal(calls,0);
});
test('quota, access, configuration and server errors are sanitized with no retries',async()=>{
  for (const [status,code] of [[429,'provider-quota'],[403,'provider-access'],[401,'provider-access'],[400,'provider-config'],[404,'provider-config'],[503,'provider-unavailable']]) {
    let calls=0;
    await rejectCode(adapter(async()=>{calls++;return new Response('private upstream text',{status});})(image),code);
    assert.equal(calls,1);
  }
});
test('invalid JSON or missing fields are rejected',async()=>{
  for (const response of [()=>new Response('not JSON'),()=>ok([]),()=>ok({nomi:'x'}),()=>ok({...result,artikul:123})]) await rejectCode(adapter(async()=>response())(image),'provider-invalid-response');
});
test('blocked, empty and truncated outputs are rejected',async()=>{
  for (const payload of [{promptFeedback:{blockReason:'SAFETY'}},{candidates:[]},{candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:JSON.stringify(result)}]}}]}]) await rejectCode(adapter(async()=>new Response(JSON.stringify(payload)))(image),'provider-no-result');
});
test('thinking text is excluded and unknown product stays a draft',async()=>{
  const blank=Object.fromEntries(Object.keys(result).map(k=>[k,'']));
  const run=adapter(async()=>new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{thought:true,text:'internal'},{text:JSON.stringify(blank)}]}}]})));
  assert.deepEqual(await run(image),{...blank,requiresReview:true});
});
test('oversized provider response is rejected',async()=>{
  await rejectCode(adapter(async()=>new Response('x'.repeat(65537)))(image),'provider-invalid-response');
});
test('network error never reveals key or upstream details',async()=>{
  await rejectCode(adapter(async()=>{throw Error('secret test-key');})(image),'provider-unavailable');
});
test('timeout aborts network request and releases busy lock',async()=>{
  let calls=0;
  const run=createStudioGemini({...config,timeoutMs:20,fetchImpl:async(_,req)=>{
    if (++calls===2) return ok(result);
    return new Promise((_,reject)=>req.signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
  }});
  await rejectCode(run(image),'provider-timeout');
  assert.equal((await run(image)).nomi,result.nomi);
});
test('concurrent duplicate calls are blocked in one adapter instance',async()=>{
  let finish;
  let calls=0;
  const run=adapter(async()=>{calls++;return new Promise(resolve=>{finish=resolve;});});
  const first=run(image);
  await rejectCode(run(image),'studio-busy');
  finish(ok(result));
  await first;
  assert.equal(calls,1);
});
