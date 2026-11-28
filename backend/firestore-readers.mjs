// Internal Firestore read service. Actor comes only from verified Firebase authentication.
// Never accept arbitrary query, collection, UID filter, or document reference from clients.
import { paths } from './firestore-orders.mjs';
import {publicSettings} from './firestore-aux.mjs';
import {publicBannerSnapshot} from './firestore-isolation.mjs';
const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=(code,status=400)=>{throw Object.assign(new Error(code),{status});};
const ok=(v,code,status)=>{if(!v)fail(code,status);};
const orderId=v=>typeof v==='string'&&/^[-_A-Za-z0-9]{20}$/.test(v);
const timestamp=v=>Number.isSafeInteger(v)&&v>=0;
const field=(fieldPath,direction)=>({field:{fieldPath},direction});
const equal=(fieldPath,value)=>({fieldFilter:{field:{fieldPath},op:'EQUAL',value}});
const productPath=path=>{
  const pieces=typeof path==='string'?path.split('/'):[];
  ok(pieces.length===4&&pieces[0]==='n99Categories'&&pieces[2]==='products','invalid-product-path');
  let cat,id;
  try{cat=decodeURIComponent(pieces[1]);id=decodeURIComponent(pieces[3]);}catch{fail('invalid-product-path');}
  ok(paths.product(cat,id)===path,'invalid-product-path');
  return {cat,id};
};
function pageSize(limit,max=40){ok(Number.isInteger(limit)&&limit>=1&&limit<=max,'invalid-limit');return limit;}
export async function listFirestoreOrders(run,actor,{admin=false,limit=30,cursor=null}={}){
  paths.admin(actor);pageSize(limit);
  ok(typeof admin==='boolean','invalid-request');
  if(cursor!==null)ok(rec(cursor)&&orderId(cursor.id)&&timestamp(cursor.createdAt),'invalid-cursor');
  return run(async (tx,initial)=>{
    if(admin)ok((initial?initial[0]:await tx.get(paths.admin(actor)))===true,'forbidden',403);
    const query={from:[{collectionId:'n99Orders'}],orderBy:[field('createdAt','DESCENDING'),field('__name__','DESCENDING')],limit:limit+1};
    if(!admin)query.where=equal('uid',{stringValue:actor});
    if(cursor)query.startAt={values:[{integerValue:String(cursor.createdAt)},{referenceValue:tx.reference(paths.order(cursor.id))}],before:false};
    const rows=await tx.query(query);
    const items=rows.map(({path,value})=>{
      const id=path.split('/')[1];
      ok(orderId(id)&&paths.order(id)===path&&rec(value?.index)&&rec(value?.order)&&timestamp(value.index.createdAt)&&value.index.createdAt===value.order.createdAt,'invalid-order-data',503);
      ok(admin||value.index.uid===actor,'invalid-order-owner',503);
      return {id,uid:value.index.uid,createdAt:value.index.createdAt,data:admin?value.index:value.order};
    });
    const more=items.length>limit, page=items.slice(0,limit),last=page.at(-1);
    return {items:page,next:more?{id:last.id,createdAt:last.createdAt}:null};
  },admin?[paths.admin(actor)]:[]);
}
export async function listFirestoreProducts(run,{limit=30,cursor=null,includeContent=false}={}){
  pageSize(limit);
  if(cursor!==null)productPath(cursor);
  ok(typeof includeContent==='boolean'&&(!includeContent||cursor===null),'invalid-request');
  return run(async (tx,initial)=>{
    const contentPaths=[paths.settings,paths.banners];
    const content=includeContent?(initial??(tx.getAll?await tx.getAll(contentPaths):await Promise.all(contentPaths.map(p=>tx.get(p))))):null;
    const query={from:[{collectionId:'products',allDescendants:true}],where:equal('archived',{booleanValue:false}),orderBy:[field('__name__','ASCENDING')],limit:limit+1};
    if(cursor)query.startAt={values:[{referenceValue:tx.reference(cursor)}],before:false};
    const rows=await tx.query(query);
    const items=rows.map(({path,value})=>{
      const {cat,id}=productPath(path);
      ok(rec(value)&&value.archived!==true&&typeof value.nomi==='string'&&Number.isSafeInteger(value.narxi)&&value.narxi>=0&&Number.isSafeInteger(value.qoldiq)&&value.qoldiq>=0,'invalid-product-data',503);
      return {path,cat,id,data:value};
    });
    const more=items.length>limit,page=items.slice(0,limit);
    return {items:page,next:more?page.at(-1).path:null,...(content?{settings:publicSettings(content[0]),...publicBannerSnapshot(content[1])}:{})};
  },includeContent?[paths.settings,paths.banners]:[]);
}
