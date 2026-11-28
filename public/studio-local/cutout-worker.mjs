// Optional staging/local browser worker. Never sends source photos over the network.
import {MODEL_SIDE,MODEL_BYTES,MODEL_SHA256,prepareTensor,logitsToMask,applyStudioMask} from './mask.mjs';
let session,ort,busy=false;
async function getSession(){
  if(session)return session;
  // Runtime is installed separately on the local/staging host; no CDN JS execution.
  ort=await import('./assets/ort.wasm.min.mjs');
  ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
  ort.env.wasm.wasmPaths=new URL('./assets/',import.meta.url).href;
  const res=await fetch(new URL('./assets/birefnet_lite_512_fp16w.onnx',import.meta.url),{redirect:'error'});
  if(!res.ok||!res.body)throw Error('studio-model-unavailable');
  const reader=res.body.getReader(),bytes=new Uint8Array(MODEL_BYTES);let at=0;
  try{
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      if(at+value.byteLength>bytes.length){void reader.cancel().catch(()=>{});throw Error('studio-model-integrity');}
      bytes.set(value,at);at+=value.byteLength;
    }
  }finally{reader.releaseLock();}
  if(at!==MODEL_BYTES)throw Error('studio-model-integrity');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
  if(hash!==MODEL_SHA256)throw Error('studio-model-integrity');
  const loaded=await ort.InferenceSession.create(bytes,{executionProviders:['wasm'],graphOptimizationLevel:'basic'});
  if(loaded.inputNames.length!==1||loaded.inputNames[0]!=='input_image'||!loaded.outputNames.includes('output_image')){
    await loaded.release();throw Error('studio-model-contract');
  }
  session=loaded;return loaded;
}
function canvas(w,h,alpha){
  const c=new OffscreenCanvas(w,h),ctx=c.getContext('2d',{alpha,colorSpace:'srgb',willReadFrequently:true});
  if(!ctx)throw Error('studio-browser-unavailable');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';return {c,ctx};
}
async function cutout(source){
  if(!(source instanceof Blob)||source.size<1||source.size>15*1024*1024||!['image/jpeg','image/png','image/webp'].includes(source.type))throw Error('studio-source-type');
  const b=await createImageBitmap(source,{imageOrientation:'from-image',colorSpaceConversion:'default'});
  try{
    if(b.width<1||b.height<1||b.width>8192||b.height>8192||b.width*b.height>20000000)throw Error('studio-source-dimensions');
    const s=MODEL_SIDE,input=canvas(s,s,false);
    input.ctx.fillStyle='#fff';input.ctx.fillRect(0,0,s,s);input.ctx.drawImage(b,0,0,s,s);
    const model=await getSession(),tensor=new ort.Tensor('float32',prepareTensor(input.ctx.getImageData(0,0,s,s).data),[1,3,s,s]);
    let results;
    try{
      results=await model.run({input_image:tensor});
      const out=results.output_image;
      if(!out||out.dims.length!==4||out.dims.some((v,i)=>v!==[1,1,s,s][i]))throw Error('studio-model-contract');
      const mask=logitsToMask(out.data,s),scale=Math.min(1,1600/Math.max(b.width,b.height));
      const w=Math.max(1,Math.round(b.width*scale)),h=Math.max(1,Math.round(b.height*scale));
      const {c,ctx}=canvas(w,h,true);ctx.drawImage(b,0,0,w,h);
      const data=ctx.getImageData(0,0,w,h);
      data.data.set(applyStudioMask(data.data,w,h,mask,s));ctx.putImageData(data,0,0);
      const blob=await c.convertToBlob({type:'image/png'});
      if(blob.type!=='image/png'||blob.size<1||blob.size>10*1024*1024)throw Error('studio-export-size');
      return blob;
    }finally{
      tensor.dispose();if(results)for(const value of Object.values(results))value.dispose();
    }
  }finally{b.close();}
}
const errors=new Set(['studio-model-unavailable','studio-model-integrity','studio-model-contract','studio-mask-input','studio-mask-output','studio-mask-uncertain','studio-source-type','studio-source-dimensions','studio-browser-unavailable','studio-export-size']);
self.onmessage=async({data})=>{
  if(!data||data.type!=='cutout'||!Number.isSafeInteger(data.id))return;
  const id=data.id;
  if(busy){self.postMessage({id,error:'studio-busy'});return;}
  busy=true;
  try{self.postMessage({id,blob:await cutout(data.source)});}
  catch(e){self.postMessage({id,error:errors.has(e?.message)?e.message:'studio-cutout-unavailable'});}
  finally{busy=false;}
};
