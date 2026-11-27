// Staging only. Never bind production credentials or database to this Worker.
const PROJECT = 'optovik-n99-staging';
const DATABASE = 'https://optovik-n99-staging-default-rtdb.europe-west1.firebasedatabase.app';
const MAX_BODY = 32768, MAX_DB = 1048576;
const record = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const own = (v,k) => record(v) && Object.hasOwn(v,k) ? v[k] : undefined;
const key = v => typeof v === 'string' && v.length > 0 && v.length <= 100 && !/[.#$\[\]/\x00-\x1f\x7f]/.test(v) && !['__proto__','constructor','prototype'].includes(v);
const oid = v => typeof v === 'string' && /^[-_A-Za-z0-9]{20}$/.test(v) && key(v);
const integer = (v,min,max) => Number.isSafeInteger(v) && v >= min && v <= max;
const str = (v,min,max) => typeof v === 'string' && v.trim().length >= min && v.length <= max;
const fail = (code,status=400) => { throw Object.assign(new Error(code),{status}); };
const requireOk = (v,code,status) => { if(!v) fail(code,status); };
const node = (v,k) => { if(!Object.hasOwn(v,k)) v[k] = {}; requireOk(record(v[k]),'invalid-data',503); return v[k]; };
const productAt = (root,cat,id) => own(own(root.tovarlar,cat),id);
const statuses = ['yangi','tasdiqlandi','yolda','tayyor','yetkazildi','bekor'];
const ts = () => Date.now();
const json = (v,status=200) => Response.json(v,{status,headers:{'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','X-Content-Type-Options':'nosniff'}});
const b64 = bytes => btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const enc = v => b64(new TextEncoder().encode(JSON.stringify(v)));
const decode = v => JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(v.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
// Log only fixed stage names and HTTP status codes; never log tokens or request bodies.
function upstream(res, stage) {
  if (!res.ok) {
    console.warn('n99-upstream', stage, res.status);
    fail(stage+'-failed',503);
  }
}
async function atStage(stage, task) {
  try { return await task(); }
  catch (error) {
    if (!error?.status || error.status >= 500) console.warn('n99-stage',stage);
    throw error;
  }
}
let cachedToken;
async function accessToken(env) {
  const a=JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  requireOk(env.FIREBASE_PROJECT_ID===PROJECT && env.FIREBASE_DATABASE_URL===DATABASE && a.project_id===PROJECT && a.client_email.endsWith('@'+PROJECT+'.iam.gserviceaccount.com'),'invalid-environment',503);
  if(cachedToken?.email===a.client_email && cachedToken?.keyId===a.private_key_id && cachedToken.until>Date.now()+60000) return cachedToken.value;
  const now=Math.floor(Date.now()/1000);
  const input=enc({alg:'RS256',typ:'JWT'})+'.'+enc({iss:a.client_email,scope:'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+300});
  const pem=a.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,'');
  const k=await crypto.subtle.importKey('pkcs8',Uint8Array.from(atob(pem),c=>c.charCodeAt(0)),{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const sig=await crypto.subtle.sign('RSASSA-PKCS1-v1_5',k,new TextEncoder().encode(input));
  const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:input+'.'+b64(new Uint8Array(sig))}),signal:AbortSignal.timeout(8000)});
  upstream(res,'oauth');
  const t=await res.json();
  requireOk(typeof t.access_token==='string' && integer(t.expires_in,1,86400),'auth-unavailable',503);
  cachedToken={email:a.client_email,keyId:a.private_key_id,value:t.access_token,until:Date.now()+t.expires_in*1000};
  return t.access_token;
}
async function identity(request,env) {
  const token=request.headers.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_.-]{1,8192})$/)?.[1];
  requireOk(token,'unauthenticated',401);
  let claims;
  try { claims=decode(token.split('.')[1]); } catch { fail('unauthenticated',401); }
  requireOk(claims.aud===PROJECT && claims.iss==='https://securetoken.google.com/'+PROJECT && key(claims.sub) && claims.sub.length<=100 && integer(claims.exp,Math.floor(Date.now()/1000)+1,Number.MAX_SAFE_INTEGER),'unauthenticated',401);
  requireOk(typeof env.FIREBASE_WEB_API_KEY==='string' && env.FIREBASE_WEB_API_KEY.length>20,'invalid-environment',503);
  const res=await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key='+encodeURIComponent(env.FIREBASE_WEB_API_KEY),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token}),signal:AbortSignal.timeout(8000)});
  if(res.status===400 || res.status===401 || res.status===403) fail('unauthenticated',401);
  upstream(res,'identity');
  const result=await res.json();
  const user=result.users?.[0];
  requireOk(user?.localId===claims.sub && !user.disabled && (!user.validSince || Number(claims.auth_time)>=Number(user.validSince)),'unauthenticated',401);
  return claims.sub;
}
async function boundedJson(response,limit) {
  const reader=response.body?.getReader();
  requireOk(reader,'invalid-body');
  let bytes=0, out='';
  const decoder=new TextDecoder('utf-8',{fatal:true});
  try {
    while(true) {
      const {value,done}=await reader.read(); if(done) break;
      bytes+=value.byteLength;
      if(bytes>limit) { await reader.cancel(); fail('size-limit',413); }
      out+=decoder.decode(value,{stream:true});
    }
    out+=decoder.decode();
    return JSON.parse(out);
  } catch(e) { if(e.status) throw e; fail('invalid-json'); }
  finally { reader.releaseLock(); }
}
// Pure mutation, tested without credentials. The caller commits the whole snapshot conditionally.
export function createOrder(root,uid,b,now) {
  requireOk(key(uid) && record(root) && record(b) && oid(b.id) && integer(b.raqam,100000,999999) && record(b.order),'invalid-request');
  const o=b.order;
  const existing=own(own(root.orders,uid),b.id);
  if(existing) {
    requireOk(existing.raqam===b.raqam,'id-conflict',409);
    return {changed:false,value:{id:b.id,raqam:existing.raqam,recovered:true}};
  }
  requireOk(!own(root.orderIndex,b.id),'id-conflict',409);
  const c=own(root.customers,uid);
  requireOk(!c?.lastOrderAt || (integer(c.lastOrderAt,0,now) && now-c.lastOrderAt>=30000),'rate-limit',429);
  requireOk(record(o.mijoz) && str(o.mijoz.ism,2,80) && /^\+998[0-9]{9}$/.test(o.mijoz.telefon) && typeof o.mijoz.telefon==='string','invalid-customer');
  const y=o.yetkazish;
  requireOk(record(y) && ['olib','kuryer'].includes(y.turi),'invalid-delivery');
  const delivery={turi:y.turi};
  if(y.turi==='kuryer') {
    requireOk(str(y.manzil,6,300),'invalid-address'); delivery.manzil=y.manzil.trim();
    if(y.moljal!==undefined) {requireOk(str(y.moljal,0,200),'invalid-address');delivery.moljal=y.moljal.trim();}
    if(y.lat!==undefined || y.lng!==undefined) {requireOk(Number.isFinite(y.lat)&&Math.abs(y.lat)<=90&&Number.isFinite(y.lng)&&Math.abs(y.lng)<=180,'invalid-coordinates');delivery.lat=y.lat;delivery.lng=y.lng;}
  }
  requireOk(['uz','ru'].includes(o.til) && ['ios','android','web'].includes(o.platforma) && o.tolov==='naqd','invalid-request');
  requireOk(record(o.items),'invalid-cart');
  const items={};let subtotal=0,count=0,lines=0;
  for(const [cat,group] of Object.entries(o.items)) {
    requireOk(key(cat)&&record(group)&&Object.keys(group).length>0,'invalid-cart');
    for(const [id,line] of Object.entries(group)) {
      requireOk(key(id)&&record(line)&&integer(line.soni,1,999)&&++lines<=50,'invalid-cart');
      const p=productAt(root,cat,id);
      requireOk(record(p)&&(p.archived===undefined||p.archived===false),'stock-unavailable',409);
      requireOk(integer(p.qoldiq,line.soni,1000000)&&integer(p.narxi,0,1000000000)&&str(p.nomi,1,160),'stock-unavailable',409);
      requireOk(line.narxi===p.narxi,'quote-changed',409);
      const item={nomi:p.nomi,narxi:p.narxi,soni:line.soni};
      if(integer(p.eskiNarx,p.narxi+1,1000000000)) item.eskiNarx=p.eskiNarx;
      node(items,cat)[id]=item;
      subtotal+=p.narxi*line.soni;count+=line.soni;
    }
  }
  requireOk(lines>0&&integer(subtotal,0,1000000000000),'invalid-cart');
  const s=root.settings?.shop;
  requireOk(record(s)&&integer(s.courierFee,0,10000000)&&integer(s.freeDeliveryFrom,0,1000000000)&&typeof s.pickupEnabled==='boolean'&&typeof s.courierEnabled==='boolean','invalid-settings',503);
  requireOk(y.turi==='olib'?s.pickupEnabled:s.courierEnabled,'delivery-disabled',409);
  const fee=y.turi==='kuryer'&&!(s.freeDeliveryFrom>0&&subtotal>=s.freeDeliveryFrom)?s.courierFee:0;
  requireOk(o.summa===subtotal&&o.soni===count&&o.yetkazishNarxi===fee&&o.jami===subtotal+fee,'quote-changed',409);
  const order={raqam:b.raqam,createdAt:now,updatedAt:now,holat:'yangi',tarix:{yangi:now},mijoz:{ism:o.mijoz.ism.trim(),telefon:o.mijoz.telefon},yetkazish:delivery,tolov:'naqd',items,summa:subtotal,yetkazishNarxi:fee,jami:subtotal+fee,soni:count,til:o.til,platforma:o.platforma};
  if(o.izoh!==undefined) {requireOk(str(o.izoh,0,500),'invalid-note');order.izoh=o.izoh.trim();}
  node(node(root,'orders'),uid)[b.id]=order;
  node(root,'orderIndex')[b.id]={uid,raqam:b.raqam,createdAt:now,holat:'yangi',jami:order.jami,ism:order.mijoz.ism,telefon:order.mijoz.telefon,soni:count,turi:y.turi};
  node(node(root,'customers'),uid).lastOrderAt=now;
  return {changed:true,value:{id:b.id,raqam:b.raqam,recovered:false}};
}
export function transition(root,actor,b,now) {
  requireOk(key(actor)&&record(root)&&record(b)&&key(b.uid)&&oid(b.id)&&statuses.includes(b.expected)&&statuses.includes(b.next),'invalid-request');
  const admin=own(root.admins,actor)===true;
  requireOk(admin||(actor===b.uid&&b.next==='bekor'&&b.expected==='yangi'),'forbidden',403);
  const o=own(own(root.orders,b.uid),b.id), i=own(root.orderIndex,b.id);
  requireOk(record(o)&&record(i)&&i.uid===b.uid&&i.holat===o.holat,'order-missing',409);
  if(o.holat===b.next&&o.tarix?.[b.next]) return {changed:false,value:{ok:true}};
  requireOk(o.holat===b.expected&&!['bekor','yetkazildi'].includes(o.holat),'order-changed',409);
  const flow=o.yetkazish?.turi==='kuryer'?['yangi','tasdiqlandi','yolda','yetkazildi']:['yangi','tasdiqlandi','tayyor','yetkazildi'];
  requireOk(b.next==='bekor'||(admin&&flow[flow.indexOf(o.holat)+1]===b.next),'invalid-transition',409);
  requireOk((o.holat==='yangi'&&o.zaxira!==true)||(o.holat!=='yangi'&&o.zaxira===true),'invalid-reservation',409);
  const reserve=b.next==='tasdiqlandi', release=b.next==='bekor'&&o.zaxira===true;
  const changes=[];let count=0,subtotal=0,lines=0;
  requireOk(record(o.items),'invalid-order',409);
  for(const [cat,group] of Object.entries(o.items)) {
    requireOk(key(cat)&&record(group),'invalid-order',409);
    for(const [id,line] of Object.entries(group)) {
      requireOk(key(id)&&record(line)&&integer(line.soni,1,999)&&integer(line.narxi,0,1000000000)&&++lines<=50,'invalid-order',409);
      count+=line.soni;subtotal+=line.soni*line.narxi;
      if(reserve||release) {
        const p=productAt(root,cat,id);
        requireOk(record(p)&&integer(p.qoldiq,0,1000000)&&integer(p.revision??0,0,Number.MAX_SAFE_INTEGER-1),'invalid-stock',409);
        const stock=p.qoldiq+(reserve?-line.soni:line.soni);
        requireOk(integer(stock,0,1000000),'stock-unavailable',409);
        changes.push([p,stock,(p.revision??0)+1]);
      }
    }
  }
  requireOk(lines>0&&integer(subtotal,0,1000000000000)&&integer(o.yetkazishNarxi,0,10000000)&&o.summa===subtotal&&o.soni===count&&o.jami===subtotal+o.yetkazishNarxi,'invalid-order',409);
  for(const [p,stock,revision] of changes){p.qoldiq=stock;p.revision=revision;p.updatedAt=now;}
  if(reserve||release)o.zaxira=reserve;
  o.holat=b.next;o.updatedAt=now;node(o,'tarix')[b.next]=now;i.holat=b.next;
  return {changed:true,value:{ok:true}};
}
export async function transact(get,put,mutate) {
  for(let attempt=0;attempt<4;attempt++){
    const {root,etag}=await get();
    requireOk(record(root)&&typeof etag==='string'&&etag.length>0,'invalid-database',503);
    const result=mutate(root);
    if(!result.changed||await put(root,etag)) return result.value;
  }
  fail('concurrent-update',503);
}
async function databaseMutation(env,mutate) {
  const token=await atStage('service-token',()=>accessToken(env));
  const headers={Authorization:'Bearer '+token,'Cache-Control':'no-store'};
  return transact(async()=>{
    return atStage('database-read',async()=>{
      const res=await fetch(DATABASE+'/.json',{cache:'no-store',headers:{...headers,'X-Firebase-ETag':'true','Accept-Encoding':'identity'},signal:AbortSignal.timeout(8000)});
      upstream(res,'database-read');
      const etag=res.headers.get('ETag');
      requireOk(etag,'missing-etag',503);
      return {root:await boundedJson(res,MAX_DB),etag};
    });
  },async(root,etag)=>{
    const body=JSON.stringify(root);
    requireOk(new TextEncoder().encode(body).length<=MAX_DB,'database-size-limit',503);
    return atStage('database-write',async()=>{
      const res=await fetch(DATABASE+'/.json',{method:'PUT',headers:{...headers,'If-Match':etag,'Content-Type':'application/json'},body,signal:AbortSignal.timeout(10000)});
      if(res.status===412){await res.body?.cancel();return false;}
      upstream(res,'database-write');
      await res.body?.cancel();return true;
    });
  },mutate);
}
export default {async fetch(request,env){
  const path=new URL(request.url).pathname;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'POST, GET, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
  if(request.method==='GET'&&path==='/')return json({app:'OPTOVIK N99',environment:'staging',version:2});
  if(request.method!=='POST'||!['/v1/orders','/v1/transition'].includes(path))return json({error:'not-found'},404);
  try {
    const uid=await atStage('identity',()=>identity(request,env));
    const b=await boundedJson(request,MAX_BODY);
    const value=await atStage('transaction',()=>databaseMutation(env,root=>{
      try { return path==='/v1/orders'?createOrder(root,uid,b,ts()):transition(root,uid,b,ts()); }
      catch(error) {
        if(error?.status>=500) console.warn('n99-stage','order-data-validation',error.message==='invalid-settings'?'invalid-settings':'invalid-data');
        throw error;
      }
    }));
    return json(value);
  } catch(e){
    const status=integer(e.status,400,599)?e.status:503;
    return json({error:status>=500?'unavailable':e.message},status);
  }
}};
