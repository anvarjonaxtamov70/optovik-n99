// Functional migration/transaction rehearsal on a disposable local Firestore only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {localFirestoreRunner,isLocalFirestoreHost} from '../backend/firestore-rest.mjs';
import {executeFirestoreOrder,paths} from '../backend/firestore-orders.mjs';
import {mutateFirestoreProduct,saveFirestoreOrderNote,readFirestoreOrder,updateFirestoreDelivery} from '../backend/firestore-admin.mjs';
import {listFirestoreOrders,listFirestoreProducts} from '../backend/firestore-readers.mjs';
import {syntheticDatasetRunner,listBanners,mutateBanner} from '../backend/firestore-isolation.mjs';
import {createFirestoreApi} from '../backend/firestore-api.mjs';
import {planFirestoreImport} from '../backend/firestore-migration.mjs';
import {createOrder,transition} from '../backend/staging-worker.mjs';
const host=process.env.FIRESTORE_EMULATOR_HOST;
if(!isLocalFirestoreHost(host))throw new Error('Local emulator required');
const run=(task,options)=>localFirestoreRunner({host,deadline:Date.now()+30000})(task,options);
const uid='synthetic',admin='testadmin',id='-AAAAAAAAAAAAAAAAAAA',now=1800000000000;
const request=(key=id)=>({id:key,raqam:123456,order:{mijoz:{ism:'Synthetic',telefon:'+998900000000'},yetkazish:{turi:'olib'},tolov:'naqd',til:'uz',platforma:'ios',items:{optika:{fara:{narxi:100,soni:1}}},summa:100,jami:100,soni:1,yetkazishNarxi:0}});
test('local Firestore imports synthetic reserved order and continues fulfillment',async()=>{
 const root={admins:{[admin]:true},tovarlar:{optika:{fara:{nomi:'Synthetic',narxi:100,qoldiq:2,revision:1}}},settings:{shop:{pickupEnabled:true,courierEnabled:true,courierFee:0,freeDeliveryFrom:0}}};
 createOrder(root,uid,request(),now);
 transition(root,admin,{uid,id,expected:'yangi',next:'tasdiqlandi'},now+1);
 const plan=planFirestoreImport(root);
 await run(async tx=>{for(const [path,value] of plan.docs)tx.set(path,value);});
 const product=()=>run(tx=>tx.get(paths.product('optika','fara')));
 assert.equal((await product()).qoldiq,1);
 await executeFirestoreOrder(run,'change',admin,{uid,id,expected:'tasdiqlandi',next:'bekor'},now+2);
 assert.equal((await product()).qoldiq,2);
 const second='-BBBBBBBBBBBBBBBBBBB';
 const submitted=await executeFirestoreOrder(run,'create','second',request(second),now+30001);
 assert.equal(submitted.recovered,false);
 assert.equal((await executeFirestoreOrder(run,'create','second',request(second),now+30002)).recovered,true);
 await executeFirestoreOrder(run,'change',admin,{uid:'second',id:second,expected:'yangi',next:'tasdiqlandi'},now+30003);
 assert.equal((await product()).qoldiq,1);
 assert.equal((await run(tx=>tx.get(paths.order(second)))).index.holat,'tasdiqlandi');
 const current=await product();
 const edit=(actor,action,expectedRevision,patch)=>mutateFirestoreProduct(run,actor,{cat:'optika',id:'fara',action,expectedRevision,patch},now+30004);
 await assert.rejects(edit(admin,'quick',current.revision-1,{qoldiq:10}),/product-conflict/);
 await edit(admin,'quick',current.revision,{narxi:120});
 await edit(admin,'archive',current.revision+1);
 await executeFirestoreOrder(run,'change',admin,{uid:'second',id:second,expected:'tasdiqlandi',next:'bekor'},now+30005);
 assert.equal((await product()).qoldiq,2);
 assert.equal((await product()).archived,true);
 await saveFirestoreOrderNote(run,admin,{uid:'second',id:second,note:'Synthetic'});
 assert.equal((await readFirestoreOrder(run,'second',second)).adminIzoh,undefined);
 assert.equal((await readFirestoreOrder(run,admin,second,'second')).adminIzoh,'Synthetic');
 await updateFirestoreDelivery(run,admin,{courierFee:5000});
 assert.equal((await run(tx=>tx.get(paths.settings))).courierFee,5000);
 const mine=await listFirestoreOrders(run,'second',{limit:1});
 assert.equal(mine.items.length,1);assert.equal(mine.items[0].id,second);
 const first=await listFirestoreOrders(run,admin,{admin:true,limit:1});
 assert.equal(first.items[0].id,second);assert.ok(first.next);
 const next=await listFirestoreOrders(run,admin,{admin:true,limit:1,cursor:first.next});
 assert.equal(next.items[0].id,id);assert.equal(next.next,null);
 assert.equal((await listFirestoreProducts(run)).items.length,0);
 for(const key of ['new-a','new-b'])await mutateFirestoreProduct(run,admin,{cat:'optika',id:key,action:'create',expectedRevision:null,patch:{nomi:'Synthetic',narxi:120,qoldiq:2}},now+30006);
 const catalog=await listFirestoreProducts(run,{limit:1});assert.equal(catalog.items[0].id,'new-a');assert.ok(catalog.next);
 const nextProduct=await listFirestoreProducts(run,{limit:1,cursor:catalog.next});assert.equal(nextProduct.items[0].id,'new-b');assert.equal(nextProduct.next,null);
 const api=createFirestoreApi({enabled:()=>true,authenticate:async req=>req.headers.get('Authorization'),runner:async()=>run,clock:()=>now+60000});
 const call=(path,body,actor='second')=>api.fetch(new Request('https://example.test'+path,{method:'POST',headers:{Authorization:actor,'Content-Type':'application/json'},body:JSON.stringify(body)}),{});
 const page=await call('/v1/catalog/list',{limit:1});assert.equal(page.status,200);assert.equal((await page.json()).items[0].id,'new-a');
 const history=await call('/v1/orders/list',{uid,admin:true});assert.equal(history.status,200);assert.equal((await history.json()).items[0].id,second);
 assert.equal((await call('/v1/admin/orders/list',{})).status,403);
 assert.equal((await call('/v1/admin/product',{cat:'optika',id:'new-a',action:'quick',expectedRevision:1,patch:{narxi:130}},admin)).status,200);
 assert.equal((await run(tx=>tx.get(paths.product('optika','new-a')))).narxi,130);

 await run(async tx=>tx.set(paths.dataset,{kind:'synthetic-only',version:1}));
 const isolated=syntheticDatasetRunner(run);
 const bannerId='-CCCCCCCCCCCCCCCCCCC';
 await mutateBanner(isolated,admin,{id:bannerId,action:'save',banner:{title:{uz:'Test',ru:'Test'},text:{uz:'',ru:''},cta:{uz:'Go',ru:'Go'},link:'catalog',theme:'brand',order:0,active:false}});
 assert.equal((await listBanners(isolated,admin,true)).banners[bannerId].active,false);
 assert.equal(Object.keys((await listBanners(isolated,'second')).banners).length,0);
 await mutateBanner(isolated,admin,{id:bannerId,action:'delete'});
 assert.equal(Object.keys((await listBanners(isolated,admin,true)).banners).length,0);

 // Exercise the candidate dispatch wrapper with a synthetic actor in the local emulator.
 const candidate=createFirestoreApi({enabled:()=>true,authenticate:async req=>req.headers.get('Authorization'),runner:async()=>isolated,clock:()=>now+120000});
 const send=(path,body,actor='candidate-guest')=>candidate.fetch(new Request('https://example.test'+path,{method:'POST',headers:{Authorization:actor,'Content-Type':'application/json'},body:JSON.stringify(body)}),{});
 const quote=await send('/v1/quote',{ids:['optika/new-a']});
 assert.equal(quote.status,200);assert.equal((await quote.json()).products[0].data.narxi,130);
 assert.equal(quote.headers.get('X-N99-Backend'),'firestore-candidate');
 const third='-DDDDDDDDDDDDDDDDDDD';
 const checkout=request(third);
 checkout.order.items={optika:{'new-a':{narxi:130,soni:1}}};checkout.order.summa=130;checkout.order.jami=130;
 const accepted=await send('/v1/orders',checkout);assert.equal(accepted.status,200);assert.equal((await accepted.json()).recovered,false);
 const repeated=await send('/v1/orders',checkout);assert.equal(repeated.status,200);assert.equal((await repeated.json()).recovered,true);
 const profile={name:'Synthetic Guest',phone:'+998900000000',address:'',apartment:'',landmark:''};
 assert.equal((await send('/v1/profile/save',profile)).status,200);
 assert.equal((await run(tx=>tx.get(paths.customer('candidate-guest')))).lastOrderAt,now+120000);
 assert.equal((await (await send('/v1/profile/get',{})).json()).profile.name,'Synthetic Guest');
 assert.equal((await send('/v1/transition',{uid:'candidate-guest',id:third,expected:'yangi',next:'tasdiqlandi'},admin)).status,200);
 assert.equal((await run(tx=>tx.get(paths.product('optika','new-a')))).qoldiq,1);
 assert.equal((await send('/v1/transition',{uid:'candidate-guest',id:third,expected:'tasdiqlandi',next:'bekor'},admin)).status,200);
 assert.equal((await run(tx=>tx.get(paths.product('optika','new-a')))).qoldiq,2);

});

test('read-only isolated snapshot retains dataset guard and cannot commit writes',async()=>{
 const isolated=syntheticDatasetRunner(run);
 const marker=await isolated(tx=>tx.get(paths.dataset),[],{readOnly:true});
 assert.equal(marker.kind,'synthetic-only');
 await assert.rejects(isolated(tx=>tx.set(paths.dataset,{kind:'invalid'}),[],{readOnly:true}),/read-only-transaction/);
 assert.equal((await isolated(tx=>tx.get(paths.dataset),[],{readOnly:true})).kind,'synthetic-only');
});

test('catalog bootstrap returns bounded catalog and public content in one isolated read',async()=>{
 const isolated=syntheticDatasetRunner(run);
 const page=await listFirestoreProducts((task,initial)=>isolated(task,initial,{readOnly:true}),{limit:1,includeContent:true});
 assert.equal(page.items.length,1);assert.equal(page.settings.pickupEnabled,true);assert.deepEqual(page.banners,{});
});

test('parallel confirmations of the last unit cannot oversell; repeated cancellation restores once',async()=>{
 const cat='race',pid='last-unit',a='race-customer-a',b='race-customer-b';
 const first='-EEEEEEEEEEEEEEEEEEE',second='-FFFFFFFFFFFFFFFFFFF';
 const productPath=paths.product(cat,pid);
 await run(async tx=>tx.set(productPath,{nomi:'Synthetic concurrency',narxi:100,qoldiq:1,revision:1,archived:false}));
 const isolated=syntheticDatasetRunner(run);
 const make=id=>{const body=request(id);body.order.items={[cat]:{[pid]:{narxi:100,soni:1}}};return body;};
 const submit=(actor,id)=>executeFirestoreOrder(isolated,'create',actor,make(id),now+180000);
 // Separate customer orders are both legitimate until reservation at confirmation.
 await Promise.all([submit(a,first),submit(b,second)]);
 const change=(uid,id,expected,next)=>executeFirestoreOrder(isolated,'change',admin,{uid,id,expected,next},now+180001);
 const out=await Promise.allSettled([change(a,first,'yangi','tasdiqlandi'),change(b,second,'yangi','tasdiqlandi')]);
 assert.equal(out.filter(x=>x.status==='fulfilled').length,1);
 const rejected=out.find(x=>x.status==='rejected');
 assert.equal(rejected.reason.message,'stock-unavailable');
 const [product,one,two]=await run(tx=>tx.getAll([productPath,paths.order(first),paths.order(second)]));
 assert.equal(product.qoldiq,0);assert.equal(product.revision,2);
 assert.deepEqual([one.index.holat,two.index.holat].sort(),['tasdiqlandi','yangi']);
 const winner=one.index.holat==='tasdiqlandi'?[a,first]:[b,second];
 const loser=one.index.holat==='tasdiqlandi'?[b,second]:[a,first];
 await Promise.all([change(...winner,'tasdiqlandi','bekor'),change(...winner,'tasdiqlandi','bekor')]);
 const restored=await run(tx=>tx.get(productPath));
 assert.equal(restored.qoldiq,1);assert.equal(restored.revision,3);
 await change(...loser,'yangi','tasdiqlandi');
 assert.equal((await run(tx=>tx.get(productPath))).qoldiq,0);
 await change(...loser,'tasdiqlandi','bekor');
 assert.equal((await run(tx=>tx.get(productPath))).qoldiq,1);
});

test('concurrent identical checkout recovers the same order without a second reservation',async()=>{
 const actor='race-replay',id='-GGGGGGGGGGGGGGGGGGG',cat='race',pid='replay-unit';
 const productPath=paths.product(cat,pid);
 await run(tx=>{tx.set(productPath,{nomi:'Synthetic replay',narxi:100,qoldiq:2,revision:1,archived:false});});
 const isolated=syntheticDatasetRunner(run);
 const body=request(id);body.order.items={[cat]:{[pid]:{narxi:100,soni:1}}};
 const submit=()=>executeFirestoreOrder(isolated,'create',actor,body,now+240000);
 const results=await Promise.all([submit(),submit()]);
 assert.deepEqual(results.map(x=>x.recovered).sort(),[false,true]);
 assert.equal((await run(tx=>tx.get(productPath))).qoldiq,2);
 const confirm=()=>executeFirestoreOrder(isolated,'change',admin,{uid:actor,id,expected:'yangi',next:'tasdiqlandi'},now+240001);
 await Promise.all([confirm(),confirm()]);
 const product=await run(tx=>tx.get(productPath));
 assert.equal(product.qoldiq,1);assert.equal(product.revision,2);
 const orders=await listFirestoreOrders(isolated,actor,{limit:10});
 assert.equal(orders.items.length,1);assert.equal(orders.items[0].id,id);
});

test('encrypted synthetic candidate backup restores into a separate disposable emulator namespace',async()=>{
 const {syntheticSeed}=await import('../backend/firestore-seed.mjs');
 const {documentFields}=await import('../backend/firestore-rest.mjs');
 const {makeCandidateBackup}=await import('../scripts/firestore-backup-format.mjs');
 const {sealBackup,openBackup}=await import('../scripts/backup-crypto.mjs');
 const {randomBytes}=await import('node:crypto');
 const {rehearseCandidate}=await import('../scripts/firestore-backup-rehearse.mjs');
 const seed=syntheticSeed('backup-restore-admin');
 const key=randomBytes(32);
 const original=Buffer.from(JSON.stringify(makeCandidateBackup(seed)));
 const restored=JSON.parse(openBackup(sealBackup(original,key),key).bytes.toString());
 const target='projects/demo-n99-firestore-restore/databases/(default)/documents';
 const base='http://'+host+'/v1/'+target;
 const names=restored.documents.map(d=>target+'/'+d.path);
 const request=async(method,body)=>{
  const res=await fetch(base+':'+method,{method:'POST',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
  assert.equal(res.status,200);return res.json();
 };
 // Create-only writes: even an accidentally reused local namespace cannot be overwritten.
 await request('commit',{writes:restored.documents.map((d,i)=>({update:{name:names[i],fields:documentFields(d.path,d.value)},currentDocument:{exists:false}}))});
 const rows=await request('batchGet',{documents:names});
 assert.equal(rows.length,names.length);
 const actual=new Map(rows.map(row=>[row.found.name.slice(target.length+1),JSON.parse(row.found.fields.payload.stringValue)]));
 assert.deepEqual(actual,seed);
 const result=await rehearseCandidate(restored,{host});
 assert.equal(result.restored,seed.size??seed.length);
 assert.equal(result.verified,result.restored);
});

test('studio quota reservation is atomic in local Firestore, never invokes provider',async()=>{
 const {reserveStudioAttempt,STUDIO_QUOTA}=await import('../backend/product-studio-quota.mjs');
 const a='studio-admin-a',b='studio-admin-b',at=now+360000;
 await run(tx=>{
  tx.set(paths.dataset,{kind:'synthetic-only',version:1});
  tx.set(paths.admin(a),true);tx.set(paths.admin(b),true);
  for(const k of ['global','admin_'+a,'admin_'+b])tx.set('n99StudioQuota/'+k,{attempts:[]});
 });
 const isolated=syntheticDatasetRunner(run);
 const out=await Promise.allSettled([reserveStudioAttempt(isolated,a,at),reserveStudioAttempt(isolated,b,at)]);
 assert.equal(out.filter(x=>x.status==='fulfilled').length,1);
 assert.equal(out.find(x=>x.status==='rejected').reason.message,'studio-cooldown');
 const [g,aa,bb]=await run(tx=>tx.getAll(['n99StudioQuota/global','n99StudioQuota/admin_'+a,'n99StudioQuota/admin_'+b]));
 assert.deepEqual(g.attempts,[at]);assert.equal(aa.attempts.length+bb.attempts.length,1);
 await assert.rejects(reserveStudioAttempt(isolated,'studio-guest',at+STUDIO_QUOTA.cooldownMs),/forbidden/);
 assert.equal((await reserveStudioAttempt(isolated,a,at+STUDIO_QUOTA.cooldownMs)).remainingGlobal,18);
});
