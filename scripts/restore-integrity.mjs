import { inspectBackup } from './check-backup.mjs';
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const int=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
// Verify the relationships needed by order fulfillment; report no personal values.
export function verifyRestore(root) {
  const counts=inspectBackup(root);
  const orders=root.orders??{}, index=root.orderIndex??{};
  if(!record(index))throw new Error('Invalid order index');
  let linked=0;
  for(const [uid,group] of Object.entries(orders))for(const [id,o] of Object.entries(group)){
    const i=Object.hasOwn(index,id)?index[id]:null;
    if(!record(i)||i.uid!==uid||i.holat!==o.holat||i.raqam!==o.raqam||i.createdAt!==o.createdAt||i.jami!==o.jami||i.soni!==o.soni)throw new Error('Order index mismatch');
    if(!record(o.items)||!int(o.yetkazishNarxi,0,10000000))throw new Error('Invalid order totals');
    let subtotal=0,count=0,lines=0;
    for(const [cat,group] of Object.entries(o.items)){
      if(!record(group))throw new Error('Invalid order items');
      for(const [pid,item] of Object.entries(group)){
        if(!record(item)||!int(item.narxi,0,1000000000)||!int(item.soni,1,999)||++lines>50)throw new Error('Invalid order item');
        if(o.zaxira===true&&!['bekor','yetkazildi'].includes(o.holat)&&!root.tovarlar[cat]?.[pid])throw new Error('Missing reserved inventory');
        subtotal+=item.narxi*item.soni;count+=item.soni;
      }
    }
    if(!lines||!int(subtotal,0,1000000000000)||o.summa!==subtotal||o.soni!==count||o.jami!==subtotal+o.yetkazishNarxi)throw new Error('Order total mismatch');
    linked++;
  }
  if(Object.keys(index).length!==linked)throw new Error('Orphan order index');
  return {...counts,linked};
}
