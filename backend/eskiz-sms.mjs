// Server-only provider adapter. Not exposed by any HTTP route until OTP gates exist.
const BASE='https://notify.eskiz.uz/api';
const fail=code=>Object.assign(new Error(code),{code});
export function eskizReady(env){
 return env?.FIREBASE_PROJECT_ID==='optovik-n99-staging'&&env?.N99_DATASET==='synthetic-only'&&env?.N99_SMS_ENABLED==='enabled'&&
  typeof env.ESKIZ_EMAIL==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.ESKIZ_EMAIL)&&
  typeof env.ESKIZ_API_PASSWORD==='string'&&env.ESKIZ_API_PASSWORD.length>0&&
  typeof env.ESKIZ_SENDER==='string'&&/^[A-Za-z0-9_-]{1,11}$/.test(env.ESKIZ_SENDER)&&
  typeof env.ESKIZ_OTP_TEMPLATE==='string'&&env.ESKIZ_OTP_TEMPLATE.split('{code}').length===2&&
  /^[\x20-\x7e]+$/.test(env.ESKIZ_OTP_TEMPLATE)&&env.ESKIZ_OTP_TEMPLATE.length<=150;
}
export function createEskizSender(env,{fetcher=fetch,clock=Date.now}={}){
 if(!eskizReady(env))throw fail('sms-disabled');
 let token=null,validUntil=0,loginPending=null;
 async function post(path,fields,bearer){
  const form=new FormData();
  for(const [k,v] of Object.entries(fields))form.set(k,v);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetcher(BASE+path,{method:'POST',body:form,signal:controller.signal,redirect:'error',headers:bearer?{Authorization:'Bearer '+bearer}:{}});
   if(!response.ok)throw fail('sms-provider-rejected');
   const data=await response.json();
   if(!data||typeof data!=='object'||Array.isArray(data))throw fail('sms-provider-rejected');
   return data;
  }catch{throw fail('sms-provider-unavailable');}
  finally{clearTimeout(timer);}
 }
 async function login(){
  if(token&&clock()<validUntil)return token;
  if(!loginPending)loginPending=(async()=>{
   const data=await post('/auth/login',{email:env.ESKIZ_EMAIL,password:env.ESKIZ_API_PASSWORD});
   if(typeof data.data?.token!=='string'||!/^[-._A-Za-z0-9]+$/.test(data.data.token)||data.data.token.length>8192)throw fail('sms-provider-rejected');
   token=data.data.token;validUntil=clock()+3600000;return token;
  })().finally(()=>{loginPending=null;});
  return loginPending;
 }
 return async ({phone,code})=>{
  if(typeof phone!=='string'||!/^\+998[0-9]{9}$/.test(phone)||typeof code!=='string'||!/^\d{6}$/.test(code))throw fail('sms-invalid-input');
  const bearer=await login();
  try{
   const data=await post('/message/sms/send',{mobile_phone:phone.slice(1),message:env.ESKIZ_OTP_TEMPLATE.replace('{code}',code),from:env.ESKIZ_SENDER},bearer);
   if(data.status!=='waiting'||typeof data.id!=='string'||!/^[-A-Za-z0-9]{1,100}$/.test(data.id))throw fail('sms-provider-rejected');
   // Accepted for delivery, not proof that the SMS reached the handset.
   return {accepted:true};
  }catch(error){
   token=null;validUntil=0;
   // An ambiguous response may have billed/sent the message. Never replay automatically.
   throw error;
  }
 };
}
