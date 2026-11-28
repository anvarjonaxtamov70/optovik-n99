import {studioImageMime,STUDIO_SOURCE_LIMITS,studioFail} from '../domain/productStudioArtwork.ts';
type WorkerLike=Pick<Worker,'postMessage'|'terminate'|'onmessage'|'onerror'|'onmessageerror'>;
type Options={createWorker?:()=>WorkerLike;timeoutMs?:number};
const errors=new Set(['studio-model-unavailable','studio-model-integrity','studio-model-contract','studio-mask-input','studio-mask-output','studio-mask-uncertain','studio-source-type','studio-source-dimensions','studio-browser-unavailable','studio-export-size','studio-busy','studio-cutout-unavailable']);
function defaultWorker():WorkerLike{
  if(typeof window==='undefined'||typeof Worker==='undefined')return studioFail('studio-browser-unavailable');
  return new Worker(new URL('/studio-local/cutout-worker.mjs',window.location.origin),{type:'module'});
}
// One reusable worker per editor; dispose on unmount. Cancellation terminates inference.
export function createStudioCutoutEngine({createWorker=defaultWorker,timeoutMs=180000}:Options={}){
  if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>180000)return studioFail('studio-invalid-timeout');
  let worker:WorkerLike|undefined,busy=false,disposed=false,sequence=0,cancelActive:(()=>void)|undefined;
  function reset(){if(worker){worker.terminate();worker=undefined;}}
  return {
    async removeBackground(source:Blob,signal?:AbortSignal):Promise<Blob>{
      if(disposed||signal?.aborted)return studioFail('studio-cancelled');
      if(busy)return studioFail('studio-busy');
      busy=true;
      try{
        if(!(source instanceof Blob)||source.size<1||source.size>STUDIO_SOURCE_LIMITS.bytes)return studioFail('studio-source-size');
        const mime=studioImageMime(new Uint8Array(await source.slice(0,12).arrayBuffer()));
        if(!mime||(source.type&&source.type!==mime))return studioFail('studio-source-type');
        if(disposed||signal?.aborted)return studioFail('studio-cancelled');
        const w=worker??(worker=createWorker()),id=++sequence;
        return await new Promise<Blob>((resolve,reject)=>{
          let done=false;
          const finish=(error?:string,blob?:Blob)=>{
            if(done)return;done=true;clearTimeout(timer);
            signal?.removeEventListener('abort',cancel);cancelActive=undefined;
            w.onmessage=null;w.onerror=null;w.onmessageerror=null;
            if(error||!blob){reset();reject(new Error(error??'studio-cutout-unavailable'));}
            else resolve(blob);
          };
          const cancel=()=>finish('studio-cancelled');
          const timer=setTimeout(()=>finish('studio-cutout-timeout'),timeoutMs);
          cancelActive=cancel;signal?.addEventListener('abort',cancel,{once:true});
          w.onmessage=event=>{
            const data=event.data;
            if(!data||data.id!==id)return;
            if(typeof data.error==='string'){finish(errors.has(data.error)?data.error:'studio-cutout-unavailable');return;}
            if(!(data.blob instanceof Blob)||data.blob.type!=='image/png'||data.blob.size<1||data.blob.size>10*1024*1024){finish('studio-cutout-unavailable');return;}
            finish(undefined,data.blob);
          };
          w.onerror=()=>finish('studio-cutout-unavailable');w.onmessageerror=()=>finish('studio-cutout-unavailable');
          if(signal?.aborted||disposed){cancel();return;}
          try{w.postMessage({type:'cutout',id,source:source.type===mime?source:new Blob([source],{type:mime})});}
          catch{finish('studio-cutout-unavailable');}
        });
      }finally{busy=false;}
    },
    dispose(){disposed=true;cancelActive?.();reset();}
  };
}
