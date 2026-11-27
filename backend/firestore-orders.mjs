// Server-side bounded Firestore transaction adapter. Not connected to live traffic.
// The runner supplies atomic get/set operations; never expose this module to Expo clients.
import { createOrder, transition, abandonOrder } from './staging-worker.mjs';
const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const own=(v,k)=>rec(v)&&Object.hasOwn(v,k)?v[k]:undefined;
const map=()=>Object.create(null);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
function key(v){
  if(typeof v!=='string'||!v.length||v.length>100||/[.#$\[\]/\x00-\x1f\x7f]/.test(v)||['__proto__','constructor','prototype'].includes(v)||/^__.*__$/.test(v))fail('invalid-key');
  return v;
}
function orderId(v){if(typeof v!=='string'||!/^[-_A-Za-z0-9]{20}$/.test(v))fail('invalid-request');return key(v);}
export const paths={
  order:id=>'n99Orders/'+orderId(id),
  customer:uid=>'n99Customers/'+encodeURIComponent(key(uid)),
  abandoned:uid=>'n99Abandoned/'+encodeURIComponent(key(uid)),
  admin:uid=>'n99Admins/'+encodeURIComponent(key(uid)),
  product:(cat,id)=>'n99Categories/'+encodeURIComponent(key(cat))+'/products/'+encodeURIComponent(key(id)),
  settings:'n99Settings/shop',
  banners:'n99Settings/banners',
  dataset:'n99Settings/dataset',
};
function emptyRoot(){return {orders:map(),orderIndex:map(),tovarlar:map(),customers:map(),admins:map(),abandonedOrders:map()};}
async function loadOrder(tx,root,uid,id){
  const entry=await tx.get(paths.order(id));
  if(entry===null)return;
  if(!rec(entry)||!rec(entry.index)||!rec(entry.order)||typeof entry.index.uid!=='string'||entry.order.raqam!==entry.index.raqam||entry.order.holat!==entry.index.holat)fail('invalid-data',503);
  root.orderIndex[id]=entry.index;
  if(entry.index.uid===uid){root.orders[uid]=map();root.orders[uid][id]=entry.order;}
}
async function loadProducts(tx,root,items){
  if(!rec(items))fail('invalid-cart');
  const list=[];
  for(const [cat,group] of Object.entries(items)){
    key(cat);if(!rec(group)||!Object.keys(group).length)fail('invalid-cart');
    for(const id of Object.keys(group)){
      key(id);if(list.length>=50)fail('invalid-cart');
      list.push([cat,id,paths.product(cat,id)]);
    }
  }
  const productPaths=list.map(([, ,path])=>path);
  const values=tx.getAll&&productPaths.length?await tx.getAll(productPaths):await Promise.all(productPaths.map(path=>tx.get(path)));
  list.forEach(([cat,id],i)=>{if(values[i]!==null){root.tovarlar[cat]??=map();root.tovarlar[cat][id]=values[i];}});
}
function putOrder(tx,root,uid,id){tx.set(paths.order(id),{order:root.orders[uid][id],index:root.orderIndex[id]});}
async function loadMarkers(tx,root,uid){
  const marks=await tx.get(paths.abandoned(uid));
  if(marks!==null){if(!rec(marks)||Object.keys(marks).length>20)fail('invalid-data',503);root.abandonedOrders[uid]=marks;}
}
export async function executeFirestoreOrder(run,operation,actor,body,now){
  key(actor);if(!rec(body))fail('invalid-request');
  const id=orderId(body.id);
  if(!['create','change','abandon'].includes(operation))fail('invalid-request');
  const uid=operation==='change'?key(body.uid):actor;
  return run(async tx=>{
    const root=emptyRoot();
    await loadOrder(tx,root,uid,id);
    if(operation==='create'){
      await loadMarkers(tx,root,uid);
      if(!own(root.orderIndex,id)&&!own(root.abandonedOrders[uid],id)){
        const [customer,shop]=tx.getAll?await tx.getAll([paths.customer(uid),paths.settings]):await Promise.all([tx.get(paths.customer(uid)),tx.get(paths.settings)]);
        if(customer!==null)root.customers[uid]=customer;
        if(shop!==null)root.settings={shop};
        await loadProducts(tx,root,body.order?.items);
      }
      const result=createOrder(root,uid,body,now);
      if(result.changed){putOrder(tx,root,uid,id);tx.set(paths.customer(uid),root.customers[uid]);}
      return result.value;
    }
    if(operation==='abandon'){
      await loadMarkers(tx,root,uid);
      const result=abandonOrder(root,uid,body,now);
      if(result.changed)tx.set(paths.abandoned(uid),root.abandonedOrders[uid]);
      return result.value;
    }
    if(await tx.get(paths.admin(actor))===true)root.admins[actor]=true;
    const order=own(root.orders[uid],id);
    if(order&&(body.next==='tasdiqlandi'||(body.next==='bekor'&&order.zaxira===true)))await loadProducts(tx,root,order.items);
    const result=transition(root,actor,body,now);
    if(result.changed){
      for(const [cat,group] of Object.entries(root.tovarlar))for(const [pid,p] of Object.entries(group))tx.set(paths.product(cat,pid),p);
      putOrder(tx,root,uid,id);
    }
    return result.value;
  });
}
