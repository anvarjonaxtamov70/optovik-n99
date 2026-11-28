// Only known server error categories may cross the API/UI boundary.
const safe=new Set(['stock-unavailable','order-changed','invalid-transition','invalid-reservation','order-missing','forbidden','product-conflict','product-archived','quote-changed','rate-limit','order-abandoned','id-conflict']);
export function safeCandidateError(value:unknown):string|undefined{
 return typeof value==='string'&&safe.has(value)?value:undefined;
}
export function adminTransitionErrorKey(error:unknown){
 const reason=safeCandidateError((error as {candidateError?:unknown}|null)?.candidateError);
 if(reason==='stock-unavailable')return 'admin.stockError';
 if(reason==='order-changed'||reason==='invalid-transition'||reason==='order-missing')return 'admin.orderConflict';
 if(reason==='forbidden'||reason==='invalid-reservation')return 'admin.err.permission';
 return undefined;
}
