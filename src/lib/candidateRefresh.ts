// Local, account-scoped invalidation. No PII is persisted or sent to other devices.
import type {Order} from '../domain/order';
export type CandidateRefresh={actor:string;uid:string;id:string;order?:Order;inventoryMayChange:boolean};
const listeners=new Set<(event:CandidateRefresh)=>void>();
export function subscribeCandidateRefresh(listener:(event:CandidateRefresh)=>void){
 listeners.add(listener);
 return ()=>{listeners.delete(listener);};
}
export function notifyCandidateRefresh(event:CandidateRefresh){
 // A view listener must not turn a committed order into a failed mutation.
 for(const listener of [...listeners]){try{listener(event);}catch{ /* other views and polling still reconcile */ }}
}
