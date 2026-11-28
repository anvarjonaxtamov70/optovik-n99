// Offline, pure migration planning. No network, no writes to a live database.
import {verifyRestore} from '../scripts/restore-integrity.mjs';
import {paths} from './firestore-orders.mjs';
import {publicSettings} from './firestore-aux.mjs';
import {documentFields} from './firestore-rest.mjs';
const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const requireOk=(v)=>{if(!v)throw new Error('Invalid migration snapshot');};
export function planFirestoreImport(root){
  const counts=verifyRestore(root);
  const docs=new Map();
  function add(path,value){
    requireOk(!docs.has(path));
    const payload=JSON.stringify(value);
    requireOk(typeof payload==='string'&&new TextEncoder().encode(payload).length<=900000);
    documentFields(path,value,payload);
    docs.set(path,structuredClone(value));
  }
  requireOk(rec(root.settings?.shop));
  add(paths.settings,publicSettings(root.settings.shop));
  for(const [cat,group] of Object.entries(root.tovarlar))for(const [id,p] of Object.entries(group)){
    requireOk(p.qoldiq<=1000000&&p.narxi<=1000000000&&Number.isSafeInteger(p.revision??0)&&(p.revision??0)>=0);
    add(paths.product(cat,id),p);
  }
  for(const [uid,group] of Object.entries(root.orders??{}))for(const [id,order] of Object.entries(group)){
    add(paths.order(id),{order,index:root.orderIndex[id]});
  }
  for(const [uid,customer] of Object.entries(root.customers??{})){
    requireOk(rec(customer));
    if(customer.lastOrderAt!==undefined)requireOk(Number.isSafeInteger(customer.lastOrderAt)&&customer.lastOrderAt>=0);
    add(paths.customer(uid),customer);
  }
  for(const [uid,admin] of Object.entries(root.admins??{})){
    requireOk(typeof admin==='boolean');
    if(admin)add(paths.admin(uid),true);
  }
  for(const [uid,marks] of Object.entries(root.abandonedOrders??{})){
    requireOk(rec(marks)&&Object.keys(marks).length<=20);
    for(const [id,m] of Object.entries(marks)){
      paths.order(id);
      requireOk(rec(m)&&Number.isInteger(m.raqam)&&m.raqam>=100000&&m.raqam<=999999&&Number.isSafeInteger(m.at)&&m.at>=0&&!root.orders?.[uid]?.[id]);
    }
    add(paths.abandoned(uid),marks);
  }
  // Non-order roots are deliberately not migrated by this planner.
  const excludedRoots=Object.keys(root).filter(k=>!['settings','tovarlar','orders','orderIndex','customers','admins','abandonedOrders'].includes(k)).sort();
  const excludedSettings=Object.keys(root.settings).filter(k=>k!=='shop').sort();
  return {docs,counts:{...counts,documents:docs.size},excludedRoots,excludedSettings};
}
