import {paths} from './firestore-orders.mjs';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const ok=(value,message,status)=>{if(!value)fail(message,status);};
export const DATASET_VERSION=1;
export function syntheticDatasetRunner(run){
 return (task,initialPaths=[])=>run(async tx=>{
  // Only server-selected paths; the marker and initial documents share one transaction read.
  const requested=[paths.dataset,...initialPaths];
  const [marker,...initial]=tx.getAll&&initialPaths.length?await tx.getAll(requested):[await tx.get(paths.dataset)];
  ok(record(marker)&&marker.kind==='synthetic-only'&&marker.version===DATASET_VERSION,'dataset-unavailable',503);
  return task(tx,initial.length?initial:undefined);
 });
}
const local=(v,max,required=false)=>record(v)&&['uz','ru'].every(k=>typeof v[k]==='string'&&v[k].length<=max&&(!required||v[k].trim().length>0))&&Object.keys(v).every(k=>k==='uz'||k==='ru');
const safeLink=v=>typeof v==='string'&&(/^(sale|new|popular|catalog|contact|delivery)$/.test(v)||/^group:(parts|accessories)$/.test(v)||/^(cat|model|search):[^\s]{1,80}$/.test(v)||/^product:[^/\s]{1,100}\/[^/\s]{1,100}$/.test(v)||/^https:\/\/\S{4,500}$/.test(v));
const bannerId=v=>typeof v==='string'&&/^[-_A-Za-z0-9]{20}$/.test(v);
function validatedBanner(v){
 ok(record(v)&&Object.keys(v).every(k=>['title','text','cta','link','theme','image','art','order','active'].includes(k)),'invalid-banner');
 ok(local(v.title,60,true)&&local(v.text,120)&&local(v.cta,30)&&safeLink(v.link)&&['brand','night','sky','sunrise','mint'].includes(v.theme)&&Number.isSafeInteger(v.order)&&v.order>=0&&v.order<=1000000&&typeof v.active==='boolean','invalid-banner');
 ok(v.image===undefined||(typeof v.image==='string'&&v.image.length<=2000&&/^https:\/\/\S+$/.test(v.image)),'invalid-banner');
 ok(v.art===undefined||['gm','accessories','sale','delivery','cash'].includes(v.art),'invalid-banner');
 return v;
}
async function bannerMap(tx){
 const raw=await tx.get(paths.banners);
 if(raw===null)return {};
 ok(record(raw)&&Object.keys(raw).length<=40,'invalid-data',503);
 for(const [id,v] of Object.entries(raw)){ok(bannerId(id),'invalid-data',503);validatedBanner(v);}
 return raw;
}
export async function listBanners(run,actor,admin=false){
 return run(async tx=>{
  if(admin)ok(await tx.get(paths.admin(actor))===true,'forbidden',403);
  const raw=await bannerMap(tx);
  return {banners:Object.fromEntries(Object.entries(raw).filter(([,b])=>admin||b.active))};
 });
}
export async function mutateBanner(run,actor,b){
 ok(record(b)&&bannerId(b.id)&&['save','delete'].includes(b.action),'invalid-request');
 const value=b.action==='save'?validatedBanner(b.banner):null;
 return run(async tx=>{
  ok(await tx.get(paths.admin(actor))===true,'forbidden',403);
  const current=await bannerMap(tx);
  const next={...current};
  if(value===null)delete next[b.id];else next[b.id]=value;
  ok(Object.keys(next).length<=40,'banner-limit',409);
  tx.set(paths.banners,next);
  return {ok:true};
 });
}
