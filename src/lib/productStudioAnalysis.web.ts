import {auth,withTimeout} from './firebase';
import {usesFirestoreCandidate} from './orderBackend';
import {readStudioAnalysis} from '../domain/productStudioDraft';
import {STUDIO_ANALYSIS_LIMITS} from '../domain/productStudioArtwork';
const endpoint='https://optovik-n99-firestore-candidate.anvarjonaxtamov.workers.dev/v1/admin/studio/analyze';
export const studioAnalysisEnabled=usesFirestoreCandidate&&process.env.EXPO_PUBLIC_N99_STUDIO_ANALYSIS==='enabled';
const safeErrors=new Set(['studio-disabled','studio-daily-limit','studio-cooldown','provider-quota','provider-no-result','provider-timeout','forbidden','unauthenticated','invalid-image-type','invalid-image-size','invalid-image-dimensions','invalid-image-bytes']);
export async function analyzeStudioPhoto(png:Blob,signal:AbortSignal){
 if(!studioAnalysisEnabled)throw Error('studio-disabled');
 if(signal.aborted)throw Error('studio-cancelled');
 if(png.type!=='image/png'||png.size<1||png.size>STUDIO_ANALYSIS_LIMITS.bytes)throw Error('invalid-image-size');
 const user=auth.currentUser;if(!user)throw Error('unauthenticated');
 const token=await withTimeout(user.getIdToken(),8000);
 if(signal.aborted)throw Error('studio-cancelled');
 if(auth.currentUser?.uid!==user.uid)throw Error('unauthenticated');
 const controller=new AbortController(),cancel=()=>controller.abort();
 signal.addEventListener('abort',cancel,{once:true});
 const timer=setTimeout(cancel,40000);
 try{
  if(signal.aborted)throw Error('studio-cancelled');
  const response=await fetch(endpoint,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'image/png'},body:png,signal:controller.signal,redirect:'error',cache:'no-store'});
  if(auth.currentUser?.uid!==user.uid)throw Error('unauthenticated');
  if(response.headers.get('X-N99-Backend')!=='firestore-candidate')throw Error('studio-invalid-response');
  const reader=response.body?.getReader();if(!reader)throw Error('studio-invalid-response');
  let text='',size=0;const decoder=new TextDecoder('utf-8',{fatal:true});
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536){void reader.cancel().catch(()=>{});throw Error('studio-invalid-response');}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();}
  finally{reader.releaseLock();}
  if(signal.aborted)throw Error('studio-cancelled');
  if(auth.currentUser?.uid!==user.uid)throw Error('unauthenticated');
  const data:unknown=JSON.parse(text);
  if(!response.ok){const code=(data as {error?:unknown}|null)?.error;throw Error(typeof code==='string'&&safeErrors.has(code)?code:'studio-analysis-unavailable');}
  return readStudioAnalysis(data);
 }catch(e){if(signal.aborted)throw Error('studio-cancelled');if(controller.signal.aborted)throw Error('provider-timeout');if(e instanceof Error&&safeErrors.has(e.message))throw e;throw Error('studio-analysis-unavailable');}
 finally{clearTimeout(timer);signal.removeEventListener('abort',cancel);}
}
