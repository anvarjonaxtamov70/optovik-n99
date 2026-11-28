import type {Order,OrderStatus} from './order';
// The authoritative order, not a retry or a cached UI state, decides whether a
// previously ambiguous transition reached its exact requested state.
export async function reconcileCandidateTransition(previous:Order,next:OrderStatus,read:()=>Promise<Order|null>,active:()=>boolean):Promise<Order|null>{
 if(!active())return null;
 try{
  const order=await read();
  if(!active()||!order||order.id!==previous.id||order.uid!==previous.uid||order.raqam!==previous.raqam||order.holat!==next||order.updatedAt<previous.updatedAt||!order.items.length)return null;
  const when=order.tarix[next];
  if(typeof when!=='number'||!Number.isFinite(when)||when<previous.updatedAt||when>order.updatedAt)return null;
  if(next==='bekor'?order.zaxira:!order.zaxira)return null;
  return order;
 }catch{return null;}
}
