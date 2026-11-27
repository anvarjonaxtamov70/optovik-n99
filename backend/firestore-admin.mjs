// Server-only operations. Actor must be the UID of a verified Firebase ID token.
// Never call directly from a client, or alongside a second inventory authority.
import { paths } from './firestore-orders.mjs';
const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{status});};
const ok=(v,code,status)=>{if(!v)fail(code,status);};
const stringLimits={nomi:160,birlik:20,artikul:80,brend:60,model:300,tavsif:5000,rasm:2000};
const optional=new Set([...Object.keys(stringLimits).filter(k=>k!=='nomi'),'eskiNarx','rasmlar','ommabop','yangi','tartib']);
const editable=new Set(['nomi','narxi','qoldiq',...optional]);
function image(v){return typeof v==='string'&&v.length<=2000&&/^https:\/\/\S+$/.test(v);}
function validateProduct(p){
  ok(rec(p)&&typeof p.nomi==='string'&&p.nomi.trim().length>=1&&int(p.narxi,0,1000000000)&&int(p.qoldiq,0,1000000),'invalid-product');
  for(const [k,v] of Object.entries(p)){
    ok(editable.has(k)||['revision','updatedAt','archived'].includes(k),'invalid-product-field');
    if(Object.hasOwn(stringLimits,k))ok(typeof v==='string'&&v.length<=stringLimits[k]&&(k!=='rasm'||image(v)),'invalid-product');
    if(k==='eskiNarx')ok(int(v,p.narxi+1,1000000000),'invalid-old-price');
    if(k==='rasmlar')ok(Array.isArray(v)&&v.length<=8&&v.every(image),'invalid-images');
    if(['ommabop','yangi','archived'].includes(k))ok(typeof v==='boolean','invalid-product');
    if(k==='tartib')ok(Number.isFinite(v),'invalid-product');
  }
}
async function requireAdmin(tx,actor){ok(await tx.get(paths.admin(actor))===true,'forbidden',403);}
export async function mutateFirestoreProduct(run,actor,b,now){
  ok(rec(b)&&['create','edit','quick','archive'].includes(b.action)&&int(now,0,Number.MAX_SAFE_INTEGER),'invalid-request');
  const path=paths.product(b.cat,b.id);
  return run(async tx=>{
    await requireAdmin(tx,actor);
    const prev=await tx.get(path);
    const create=b.action==='create';
    ok(create?prev===null:rec(prev),'product-conflict',409);
    const revision=prev?.revision??0;
    ok(int(revision,0,Number.MAX_SAFE_INTEGER-1)&&b.expectedRevision===(create?null:revision),'product-conflict',409);
    if(!create&&prev.archived===true){
      if(b.action==='archive')return {revision,archived:true};
      fail('product-archived',409);
    }
    const next={...(prev??{})};
    if(b.action==='archive'){next.archived=true;}
    else {
      ok(rec(b.patch)&&Object.keys(b.patch).length>0,'invalid-product');
      for(const [k,v] of Object.entries(b.patch)){
        ok(editable.has(k)&&(b.action!=='quick'||['narxi','qoldiq'].includes(k)),'invalid-product-field');
        if(v===null){ok(optional.has(k),'invalid-product');delete next[k];}
        else next[k]=v;
      }
      if(b.action==='quick'&&next.eskiNarx!==undefined&&next.eskiNarx<=next.narxi)delete next.eskiNarx;
    }
    validateProduct(next);
    next.revision=revision+1;next.updatedAt=now;
    tx.set(path,next);
    return {revision:next.revision,archived:next.archived===true};
  });
}
export async function saveFirestoreOrderNote(run,actor,b){
  ok(rec(b)&&typeof b.note==='string'&&b.note.length<=500,'invalid-note');
  const path=paths.order(b.id);
  return run(async tx=>{
    await requireAdmin(tx,actor);
    const entry=await tx.get(path);
    ok(rec(entry)&&rec(entry.order)&&rec(entry.index)&&entry.index.uid===b.uid,'order-missing',409);
    const order={...entry.order,adminIzoh:b.note.trim()};
    tx.set(path,{...entry,order});
    return {ok:true};
  });
}
export async function updateFirestoreDelivery(run,actor,patch){
  ok(rec(patch)&&Object.keys(patch).length>0,'invalid-settings');
  const allowed=['courierEnabled','pickupEnabled','courierFee','freeDeliveryFrom'];
  ok(Object.keys(patch).every(k=>allowed.includes(k)),'invalid-settings');
  return run(async tx=>{
    await requireAdmin(tx,actor);
    const current=await tx.get(paths.settings);
    ok(rec(current),'invalid-settings',503);
    const next={...current,...patch};
    ok(typeof next.courierEnabled==='boolean'&&typeof next.pickupEnabled==='boolean'&&int(next.courierFee,0,10000000)&&int(next.freeDeliveryFrom,0,1000000000),'invalid-settings');
    tx.set(paths.settings,next);
    return {ok:true};
  });
}
export async function readFirestoreOrder(run,actor,id,expectedUid){
  const path=paths.order(id);
  return run(async tx=>{
    const entry=await tx.get(path);
    if(entry===null)return null;
    ok(rec(entry)&&rec(entry.order)&&rec(entry.index),'invalid-data',503);
    ok(entry.index.uid===actor||await tx.get(paths.admin(actor))===true,'forbidden',403);
    if(expectedUid!==undefined&&entry.index.uid!==expectedUid)fail('order-missing',409);
    return entry.order;
  });
}
