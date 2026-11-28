// Staging-only, opt-in transport. No public login or token issuance here.
import {boundedJson,remainingBudget} from './staging-worker.mjs';
import {parseTelegramUpdate} from './telegram-identity.mjs';
const fail=()=>Object.assign(new Error('telegram-transport-unavailable'),{status:503});
const secretOk=v=>typeof v==='string'&&/^[a-fA-F0-9]{64}$/.test(v);
function sameSecret(a,b){
 if(!secretOk(a)||!secretOk(b))return false;
 let diff=0;for(let i=0;i<64;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;
}
export function telegramTransportReady(env){
 return env?.FIREBASE_PROJECT_ID==='optovik-n99-staging'&&env.N99_DATASET==='synthetic-only'&&env.N99_FIRESTORE_CANDIDATE==='enabled'&&env.N99_TELEGRAM_AUTH==='enabled'&&
 typeof env.TELEGRAM_BOT_TOKEN==='string'&&/^\d{5,20}:[A-Za-z0-9_-]{20,100}$/.test(env.TELEGRAM_BOT_TOKEN)&&secretOk(env.TELEGRAM_WEBHOOK_SECRET)&&secretOk(env.TELEGRAM_IDENTITY_SECRET)&&env.TELEGRAM_WEBHOOK_SECRET!==env.TELEGRAM_IDENTITY_SECRET;
}
const response=(status=200)=>new Response(null,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
export function createTelegramTransport({env,fetcher=fetch,clock=Date.now}){
 if(!telegramTransportReady(env))throw fail();
 return async function send(chatId,text,replyMarkup,deadline){
  if(!Number.isSafeInteger(chatId)||chatId<=0||typeof text!=='string'||text.length>500)throw fail();
  try{
   const res=await fetcher('https://api.telegram.org/bot'+env.TELEGRAM_BOT_TOKEN+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chatId,text,reply_markup:replyMarkup,protect_content:true}),signal:AbortSignal.timeout(remainingBudget(deadline,6000,clock())),redirect:'error'});
   if(!res.ok||(await res.json())?.ok!==true)throw fail();
  }catch{throw fail();} // Never include token-bearing URL or Telegram response in errors.
 };
}
const REMOVE={remove_keyboard:true};
const CONTACT={keyboard:[[{text:'Telefon raqamimni ulashish / Поделиться номером',request_contact:true}]],resize_keyboard:true,one_time_keyboard:true};
export function createTelegramWebhook({coreFor,fetcher=fetch,clock=Date.now}){
 return async function webhook(request,env){
  if(!telegramTransportReady(env))return response(503);
  if(request.method!=='POST')return response(405);
  if(!sameSecret(request.headers.get('X-Telegram-Bot-Api-Secret-Token'),env.TELEGRAM_WEBHOOK_SECRET))return response(403);
  if(!/^application\/json(?:\s*;|$)/i.test(request.headers.get('Content-Type')??''))return response(415);
  let update;
  try{update=await boundedJson(request,16384);}catch{return response(400);}
  const parsed=parseTelegramUpdate(update);
  const m=update?.message;
  // Ignore all other updates. An ordinary /start is just a harmless help message.
  const help=!parsed&&m?.text==='/start'&&m.chat?.type==='private'&&m.from?.is_bot===false&&Number.isSafeInteger(m.from.id)&&m.from.id>0&&m.chat.id===m.from.id&&!m.forward_origin&&!m.forward_date&&!m.is_automatic_forward;
  if(!parsed&&!help)return response();
  const deadline=clock()+24000;
  try{
   const send=createTelegramTransport({env,fetcher,clock});
   if(help){await send(m.from.id,'OPTOVIK N99 ilovasidan tasdiqlashni boshlang. / Начните подтверждение в приложении OPTOVIK N99.',REMOVE,deadline);return response();}
   const core=await coreFor(env,deadline);
   if(parsed.kind==='start'){
    const accepted=await core.start(parsed.token,parsed.telegramId);
    await send(parsed.telegramId,accepted?'O‘z telefon raqamingizni ulashing. / Поделитесь своим номером телефона.':'Havola eskirgan. Ilovadan yangi havola oling. / Ссылка устарела. Начните заново.',accepted?CONTACT:REMOVE,deadline);
   }else{
    const code=await core.contact(parsed.telegramId,parsed.contactId,parsed.phone);
    if(code===null){await send(parsed.telegramId,'Raqam yoki so‘rov mos kelmadi. Ilovadan qayta boshlang. / Номер или запрос не совпадает. Начните заново.',REMOVE,deadline);}
    else await send(parsed.telegramId,'OPTOVIK N99: '+code+'\n5 daqiqa ichida ilovaga kiriting. Kodni hech kimga bermang.\nВведите код в приложении. Никому не сообщайте его.',REMOVE,deadline);
   }
   return response();
  }catch{
   // Telegram may retry a failed update. Core contact is one-use, so retry never creates a second OTP.
   // If delivery fails after commit, request a new challenge after cooldown.
   return response(503);
  }
 };
}
