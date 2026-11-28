// Candidate auxiliary data. All inventory/order/profile/settings reads use the same store.
import {paths} from './firestore-orders.mjs';
const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const ok=(v,message,status)=>{if(!v)fail(message,status);};
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const textLimits={name:60,phone:20,phone2:20,telegram:60,instagram:60,address:300,landmark:300,workHours:60,deliveryNote:300,legalName:120,inn:14,legalAddress:300,director:120,bankName:160,bankAccount:20,bankMfo:5,email:120,mxik:17,packageCode:10};
const numeric={courierFee:10000000,freeDeliveryFrom:1000000000,vatPercent:30};
export function publicSettings(raw){
 ok(rec(raw),'invalid-settings',503);
 const clean={};
 for(const [k,max] of Object.entries(textLimits))if(typeof raw[k]==='string'&&raw[k].length<=max)clean[k]=raw[k];
 for(const [k,max] of Object.entries(numeric))if(int(raw[k],0,max))clean[k]=raw[k];
 for(const k of ['pickupEnabled','courierEnabled'])if(typeof raw[k]==='boolean')clean[k]=raw[k];
 for(const [k,max] of [['lat',90],['lng',180]])if(Number.isFinite(raw[k])&&Math.abs(raw[k])<=max)clean[k]=raw[k];
 ok(typeof clean.pickupEnabled==='boolean'&&typeof clean.courierEnabled==='boolean'&&int(clean.courierFee,0,10000000)&&int(clean.freeDeliveryFrom,0,1000000000),'invalid-settings',503);
 return clean;
}
export async function readShop(run){return run(async (tx,initial)=>publicSettings(initial?initial[0]:await tx.get(paths.settings)),[paths.settings]);}
export async function saveShop(run,actor,raw){
 ok(rec(raw),'invalid-settings');
 const clean=publicSettings(raw);
 const keys=new Set([...Object.keys(textLimits),...Object.keys(numeric),'pickupEnabled','courierEnabled','lat','lng']);
 ok(Object.keys(raw).every(k=>keys.has(k)&&(Object.hasOwn(clean,k)||(['lat','lng'].includes(k)&&raw[k]===null))),'invalid-settings');
 for(const [k,re] of Object.entries({inn:/^([0-9]{9}|[0-9]{14})?$/,bankAccount:/^([0-9]{20})?$/,bankMfo:/^([0-9]{5})?$/,mxik:/^([0-9]{17})?$/,packageCode:/^([0-9]{1,10})?$/,email:/^([^@ ]+@[^@ ]+[.][^@ ]+)?$/}))ok(clean[k]===undefined||re.test(clean[k]),'invalid-settings');
 return run(async tx=>{ok(await tx.get(paths.admin(actor))===true,'forbidden',403);tx.set(paths.settings,clean);return {ok:true};});
}
export async function readRole(run,actor){const path=paths.admin(actor);return run(async (tx,initial)=>({admin:(initial?initial[0]:await tx.get(path))===true}),[path]);}
export async function readProfile(run,actor){const path=paths.customer(actor);return run(async (tx,initial)=>{const c=initial?initial[0]:await tx.get(path);return {profile:rec(c?.profile)?c.profile:null};},[path]);}
export async function saveProfile(run,actor,b,now){
 const limits={name:80,phone:13,address:200,apartment:80,landmark:200};
 ok(rec(b)&&Object.keys(b).every(k=>Object.hasOwn(limits,k)||k==='lat'||k==='lng'),'invalid-request');
 for(const [k,max] of Object.entries(limits))ok(typeof b[k]==='string'&&b[k].length<=max,'invalid-request');
 ok(b.name.trim().length>=2&&/^\+998[0-9]{9}$/.test(b.phone),'invalid-request');
 ok((b.lat==null&&b.lng==null)||(Number.isFinite(b.lat)&&Math.abs(b.lat)<=90&&Number.isFinite(b.lng)&&Math.abs(b.lng)<=180),'invalid-request');
 return run(async tx=>{
  const old=await tx.get(paths.customer(actor));
  ok(old===null||rec(old),'invalid-data',503);
  tx.set(paths.customer(actor),{...(old??{}),profile:{...b,updatedAt:now}});
  return {ok:true};
 });
}
export async function readQuote(run,ids){
 ok(Array.isArray(ids)&&ids.length>=1&&ids.length<=50&&new Set(ids).size===ids.length,'invalid-cart');
 const refs=ids.map(id=>{
  ok(typeof id==='string'&&id.split('/').length===2,'invalid-key');
  return paths.product(...id.split('/'));
 });
 const all=[paths.settings,...refs];
 return run(async (tx,initial)=>{
  const [shop,...products]=initial??(tx.getAll?await tx.getAll(all):await Promise.all(all.map(p=>tx.get(p))));
  return {settings:publicSettings(shop),products:ids.map((id,i)=>({id,data:products[i]}))};
 },all);
}
