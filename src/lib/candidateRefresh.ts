// Local, account-scoped invalidation. No PII is persisted or sent to other devices.
import type {Order} from '../domain/order';
export type CandidateRefresh={actor:string;uid:string;id:string;order?:Order};
const listeners=new Set<(event:CandidateRefresh)=>void>();
export function subscribeCandidateRefresh(listener:(event:CandidateRefresh)=>void){
 listeners.add(listener);
 return ()=>{listeners.delete(listener);};
}
export function notifyCandidateRefresh(event:CandidateRefresh){
 for(const listener of [...listeners])listener(event);
}
