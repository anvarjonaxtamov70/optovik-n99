import {STUDIO_PNG_LIMITS,decodeStudioPng} from './product-studio-png.mjs';
import {createStudioGemini} from './product-studio-gemini.mjs';
import {checkStudioAdmin} from './product-studio-quota.mjs';
import {createStudioService} from './product-studio-service.mjs';
export const STUDIO_PATH='/v1/admin/studio/analyze';
const fail=(code,status)=>{throw Object.assign(new Error(code),{code,status});};
const errors=new Map([
 ['unauthenticated',401],['forbidden',403],['invalid-image-type',415],['invalid-image-size',413],
 ['invalid-image-dimensions',400],['invalid-image-bytes',400],['invalid-body',400],
 ['studio-daily-limit',429],['studio-cooldown',429],['provider-quota',429],
 ['provider-no-result',422],['studio-busy',429],['provider-timeout',504],['request-timeout',408],
 ['studio-disabled',503],['provider-config',503],['provider-access',503],['provider-unavailable',503],
 ['provider-invalid-response',503],['studio-quota-unavailable',503]
]);
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Access-Control-Allow-Origin':'*','X-N99-Backend':'firestore-candidate','Access-Control-Expose-Headers':'X-N99-Backend'};
const json=(body,status=200)=>Response.json(body,{status,headers});
function remaining(deadline,clock){const ms=deadline-clock();if(!Number.isSafeInteger(ms)||ms<1)fail('request-timeout',408);return ms;}
async function readPng(request,deadline,clock){
  if(request.headers.get('Content-Type')?.trim().toLowerCase()!=='image/png')fail('invalid-image-type',415);
  if(request.headers.has('Content-Encoding')&&request.headers.get('Content-Encoding').toLowerCase()!=='identity')fail('invalid-image-type',415);
  const length=request.headers.get('Content-Length'),max=STUDIO_PNG_LIMITS.maxBytes;
  if(length!==null&&(!/^[0-9]+$/.test(length)||Number(length)>max||Number(length)<1))fail('invalid-image-size',413);
  if(!request.body)fail('invalid-body',400);
  const reader=request.body.getReader();let timer,size=0;const parts=[];
  try{
    const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(new Error('request-timeout'),{code:'request-timeout'})),remaining(deadline,clock));});
    for(;;){
      const {done,value}=await Promise.race([reader.read(),timeout]);
      if(done)break;
      size+=value.byteLength;
      if(size>max)fail('invalid-image-size',413);
      parts.push(value);
    }
    if(!size||(length!==null&&size!==Number(length)))fail('invalid-image-size',413);
    const bytes=new Uint8Array(size);let offset=0;
    for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
    return bytes;
  }catch(e){void reader.cancel().catch(()=>{});throw e;}
  finally{clearTimeout(timer);reader.releaseLock();}
}
// Wrap only the exact studio route. All existing traffic is delegated untouched.
// Credentials and provider eligibility are injected by the staging server, never the client.
export function withStudioRoute({fallback,authenticate,runner,enabled,clock=Date.now,providerFactory=createStudioGemini}){
  return {async fetch(request,env){
    if(new URL(request.url).pathname!==STUDIO_PATH)return fallback.fetch(request,env);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Max-Age':'600'}});
    if(request.method!=='POST')return json({error:'not-found'},404);
    if(enabled(env)!==true||env?.N99_STUDIO_ENABLED!=='enabled'||env?.N99_STUDIO_FREE_PROJECT_CONFIRMED!=='yes'||typeof env?.N99_STUDIO_GEMINI_KEY!=='string'||!env.N99_STUDIO_GEMINI_KEY.trim())return json({error:'studio-disabled'},503);
    const deadline=clock()+35000;
    try{
      const uid=await authenticate(request,env,deadline);
      if(typeof uid!=='string'||!uid)fail('unauthenticated',401);
      const rawRun=await runner(env,deadline);
      const run=async task=>{remaining(deadline,clock);return rawRun(task);};
      // Check role BEFORE consuming the body; the service rechecks after intake.
      await checkStudioAdmin(run,uid);
      const bytes=await readPng(request,Math.min(deadline,clock()+10000),clock);
      const analyze=async decoded=>{
        const timeoutMs=Math.min(15000,remaining(deadline,clock));
        return providerFactory({apiKey:env.N99_STUDIO_GEMINI_KEY,enabled:true,freeProjectConfirmed:true,timeoutMs})(decoded);
      };
      const service=createStudioService({run,decodeImage:decodeStudioPng,analyze,enabled:true,clock});
      return json(await service({uid,bytes}));
    }catch(e){
      const code=errors.has(e?.code)?e.code:errors.has(e?.message)?e.message:'studio-unavailable';
      return json({error:code},errors.get(code)??503);
    }
  }};
}
