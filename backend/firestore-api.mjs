// Separate candidate HTTP API; not used by the current Expo app.
// Authentication must be supplied by the trusted server entrypoint.
import {boundedJson,remainingBudget} from './staging-worker.mjs';
import {executeFirestoreOrder,paths} from './firestore-orders.mjs';
import {mutateFirestoreProduct,saveFirestoreOrderNote,updateFirestoreDelivery,readFirestoreOrder} from './firestore-admin.mjs';
import {listFirestoreProducts,listFirestoreOrders} from './firestore-readers.mjs';
const rec=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
import {readShop,saveShop,readRole,readProfile,saveProfile,readQuote} from './firestore-aux.mjs';
const routes=new Set(['/v1/orders','/v1/transition','/v1/abandon','/v1/catalog/list','/v1/orders/list','/v1/admin/orders/list','/v1/orders/get','/v1/admin/product','/v1/admin/note','/v1/admin/delivery','/v1/shop/get','/v1/admin/shop','/v1/account/role','/v1/profile/get','/v1/profile/save','/v1/quote']);
const allowedErrors=new Set(['forbidden','unauthenticated','invalid-request','invalid-limit','invalid-cursor','invalid-key','invalid-product-path','product-conflict','product-archived','order-missing','order-changed','quote-changed','stock-unavailable','rate-limit','abandon-limit','order-abandoned','id-conflict','delivery-disabled','invalid-product','invalid-product-field','invalid-images','invalid-old-price','invalid-settings','invalid-note','invalid-transition','invalid-reservation','invalid-order','invalid-stock','invalid-cart','invalid-customer','invalid-delivery','invalid-address','invalid-coordinates','invalid-json','invalid-body','size-limit']);
const headers={'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff','X-N99-Backend':'firestore-candidate','Access-Control-Expose-Headers':'X-N99-Backend'};
const json=(value,status=200)=>Response.json(value,{status,headers});
export function createFirestoreApi({authenticate,runner,enabled,clock=Date.now}){
  return {async fetch(request,env){
    const path=new URL(request.url).pathname;
    if(request.method==='GET'&&path==='/')return json({app:'OPTOVIK N99',environment:'staging',backend:'firestore-candidate',enabled:enabled(env)===true});
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'}});
    if(request.method!=='POST'||!routes.has(path))return json({error:'not-found'},404);
    if(enabled(env)!==true)return json({error:'unavailable'},503);
    const deadline=clock()+24000;
    try{
      const uid=await authenticate(request,env,deadline);
      if(typeof uid!=='string'||!uid)fail('unauthenticated',401);
      paths.admin(uid);
      if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')??''))fail('invalid-request',415);
      const b=await boundedJson(request,32768);
      if(!rec(b))fail('invalid-request');
      remainingBudget(deadline,24000,clock());
      const run=await runner(env,deadline);
      const now=clock();
      let value;
      switch(path){
        case '/v1/orders':value=await executeFirestoreOrder(run,'create',uid,b,now);break;
        case '/v1/transition':value=await executeFirestoreOrder(run,'change',uid,b,now);break;
        case '/v1/abandon':value=await executeFirestoreOrder(run,'abandon',uid,b,now);break;
        case '/v1/catalog/list':value=await listFirestoreProducts(run,{limit:b.limit,cursor:b.cursor});break;
        case '/v1/orders/list':value=await listFirestoreOrders(run,uid,{limit:b.limit,cursor:b.cursor,admin:false});break;
        case '/v1/admin/orders/list':value=await listFirestoreOrders(run,uid,{limit:b.limit,cursor:b.cursor,admin:true});break;
        case '/v1/orders/get':value={order:await readFirestoreOrder(run,uid,b.id,b.uid)};break;
        case '/v1/admin/product':value=await mutateFirestoreProduct(run,uid,b,now);break;
        case '/v1/admin/note':value=await saveFirestoreOrderNote(run,uid,b);break;
        case '/v1/admin/delivery':value=await updateFirestoreDelivery(run,uid,b);break;
        case '/v1/shop/get':value={settings:await readShop(run)};break;
        case '/v1/admin/shop':value=await saveShop(run,uid,b);break;
        case '/v1/account/role':value=await readRole(run,uid);break;
        case '/v1/profile/get':value=await readProfile(run,uid);break;
        case '/v1/profile/save':value=await saveProfile(run,uid,b,now);break;
        case '/v1/quote':value=await readQuote(run,b.ids);break;
      }
      return json(value);
    }catch(error){
      const status=Number.isInteger(error?.status)&&error.status>=400&&error.status<600?error.status:503;
      return json({error:status>=500?'unavailable':allowedErrors.has(error?.message)?error.message:'invalid-request'},status);
    }
  }};
}
