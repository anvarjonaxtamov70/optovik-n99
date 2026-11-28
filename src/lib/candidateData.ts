import {auth} from './firebase';
import {candidateRequest,usesFirestoreCandidate} from './orderBackend';
import {CANDIDATE_CATALOG_CAP,collectPages,type Page} from '../domain/candidateBackend';
import {readProduct,type Product,defaultOrder} from '../domain/products';
import {readOrder,readOrderIndex,type Order,type OrderIndex} from '../domain/order';
type Row={id:string;uid:string;data:unknown};
type Cursor={id:string;createdAt:number};
function active(uid:string){if(auth.currentUser?.uid!==uid)throw new Error('Account changed');}
type CatalogRow={cat:string;id:string;data:unknown};
type CatalogPage=Page<CatalogRow,string>&{settings?:unknown;banners?:unknown};
async function readCatalog(uid:string,includeContent:boolean){
 let content:{settings:unknown;banners:unknown}|undefined;
 const rows=await collectPages<CatalogRow,string>(async(cursor,limit)=>{
  const page=await candidateRequest<CatalogPage>('/v1/catalog/list',{cursor,limit,...(includeContent&&cursor===null?{includeContent:true}:{})},uid);
  if(includeContent&&cursor===null&&page&&Object.hasOwn(page,'settings')&&Object.hasOwn(page,'banners'))content={settings:page.settings,banners:page.banners};
  return page;
 },CANDIDATE_CATALOG_CAP,true);
 active(uid);
 const products:Product[]=rows.map(row=>{const p=readProduct(row.cat,row.id,row.data);if(!p||p.archived)throw new Error('Invalid catalog response');return p;});
 if(new Set(products.map(p=>p.id)).size!==products.length)throw new Error('Duplicate catalog');
 return {products:products.sort(defaultOrder),content};
}
export async function candidateCatalog(uid:string){return (await readCatalog(uid,false)).products;}
export async function candidateCatalogSnapshot(uid:string){
 const {products,content}=await readCatalog(uid,true);
 // Rolling staging deploy compatibility; never use another backend or cached stock.
 if(content){active(uid);return {products,...content};}
 const [shop,banners]=await Promise.all([candidateRequest<{settings:unknown}>('/v1/shop/get',{},uid),candidateRequest<{banners:unknown}>('/v1/banners/list',{},uid)]);
 active(uid);return {products,settings:shop.settings,banners:banners.banners};
}
export async function candidateOrders(uid:string,admin:boolean,limit:number){
 const rows=await collectPages<Row,Cursor>((cursor,limit)=>candidateRequest<Page<Row,Cursor>>(admin?'/v1/admin/orders/list':'/v1/orders/list',{cursor,limit},uid),limit,false);
 active(uid);
 if(new Set(rows.map(r=>r.id)).size!==rows.length)throw new Error('Duplicate orders');
 return rows;
}
export async function candidateCustomerOrders(uid:string):Promise<Order[]>{
 return (await candidateOrders(uid,false,100)).map(r=>{if(r.uid!==uid)throw new Error('Wrong account');const o=readOrder(uid,r.id,r.data);if(!o)throw new Error('Invalid order');return o;});
}
export async function candidateAdminOrders(uid:string,limit:number):Promise<OrderIndex[]>{
 return (await candidateOrders(uid,true,Math.min(limit,500))).map(r=>{const o=readOrderIndex(r.id,r.data);if(!o||o.uid!==r.uid)throw new Error('Invalid index');return o;});
}
export async function candidateOrder(uid:string,id:string,actor:string):Promise<unknown>{
 const response=await candidateRequest<{order:unknown}>('/v1/orders/get',{uid,id},actor);
 if(!Object.hasOwn(response,'order'))throw new Error('Invalid order response');
 return response.order;
}
export async function candidateHasOrders(uid:string):Promise<boolean>{
 const page=await candidateRequest<Page<Row,Cursor>>('/v1/orders/list',{limit:1,cursor:null},uid);
 if(!Array.isArray(page.items)||page.items.length>1||page.items.some(r=>r.uid!==uid)||page.next===undefined)throw new Error('Invalid history');
 return page.items.length>0;
}
export async function candidateAck(path:'/v1/admin/product'|'/v1/admin/note'|'/v1/admin/shop'|'/v1/profile/save'|'/v1/admin/banner',body:unknown,uid:string){
 const result=await candidateRequest<{ok?:boolean;revision?:number}>(path,body,uid);
 if(path==='/v1/admin/product'?(!Number.isSafeInteger(result.revision)||Number(result.revision)<1):result.ok!==true)throw new Error('Invalid acknowledgement');
}
export function assertCandidate(){if(!usesFirestoreCandidate)throw new Error('Candidate disabled');}
