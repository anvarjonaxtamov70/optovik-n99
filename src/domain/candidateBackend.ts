/** Candidate is a separate staging-only dataset. No automatic fallback between stores. */
export function candidateBackendEnabled(backend:string|undefined,environment:string|undefined,project:string|undefined,emulator:string|undefined):boolean{
 if(backend!=='firestore-candidate')return false;
 if(environment!=='staging'||project!=='optovik-n99-staging'||emulator)throw new Error('Firestore candidate is staging only');
 return true;
}
export type Page<T,C>={items:T[];next:C|null};
export async function collectPages<T,C>(read:(cursor:C|null,limit:number)=>Promise<Page<T,C>>,maximum:number,strict:boolean):Promise<T[]>{
 if(!Number.isInteger(maximum)||maximum<1||maximum>1000)throw new Error('Invalid page cap');
 const out:T[]=[];let cursor:C|null=null;const seen=new Set<string>();
 while(out.length<maximum){
  const limit=Math.min(40,maximum-out.length);
  const page=await read(cursor,limit);
  if(!page||!Array.isArray(page.items)||page.items.length>limit||page.next===undefined)throw new Error('Invalid page');
  out.push(...page.items);
  if(page.next===null)return out;
  const key=JSON.stringify(page.next);
  if(!page.items.length||seen.has(key))throw new Error('Invalid cursor');
  seen.add(key);cursor=page.next;
 }
 if(strict)throw new Error('Catalog exceeds candidate cap');
 return out;
}
