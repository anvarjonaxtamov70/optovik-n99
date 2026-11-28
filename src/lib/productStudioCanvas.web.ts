// Browser-only local photo preparation and artwork. Never import into native screens.
import {analysisSize,containStudioImage,fitStudioText,studioArtworkLayout,studioFail,studioImageMime,studioSourceSize,STUDIO_ANALYSIS_LIMITS,STUDIO_ARTWORK_LIMITS,STUDIO_SOURCE_LIMITS,type StudioArtworkInput} from '../domain/productStudioArtwork.ts';
type Runtime={decode:(source:Blob)=>Promise<ImageBitmap>;canvas:()=>HTMLCanvasElement};
function browserRuntime():Runtime{
  if(typeof document==='undefined'||typeof createImageBitmap!=='function')return studioFail('studio-browser-unavailable');
  return {decode:source=>createImageBitmap(source,{imageOrientation:'from-image',colorSpaceConversion:'default'}),canvas:()=>document.createElement('canvas')};
}
function checkAbort(signal?:AbortSignal){if(signal?.aborted)studioFail('studio-cancelled');}
async function openPhoto(source:Blob,runtime:Runtime,signal?:AbortSignal){
  checkAbort(signal);
  if(!(source instanceof Blob)||source.size<1||source.size>STUDIO_SOURCE_LIMITS.bytes)return studioFail('studio-source-size');
  const mime=studioImageMime(new Uint8Array(await source.slice(0,12).arrayBuffer()));
  if(!mime||(source.type&&source.type!==mime))return studioFail('studio-source-type');
  checkAbort(signal);
  let image:ImageBitmap;
  try{image=await runtime.decode(source);}catch{return studioFail('studio-source-decode');}
  try{checkAbort(signal);studioSourceSize(image.width,image.height);return image;}
  catch(e){image.close();throw e;}
}
function surface(runtime:Runtime,width:number,height:number){
  const canvas=runtime.canvas();canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false,colorSpace:'srgb'});
  if(!ctx)return studioFail('studio-canvas-unavailable');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  return {canvas,ctx};
}
async function png(canvas:HTMLCanvasElement,max:number,signal?:AbortSignal){
  checkAbort(signal);
  const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('studio-export-failed')),'image/png'));
  checkAbort(signal);
  if(blob.type!=='image/png'||blob.size<1||blob.size>max)return studioFail('studio-export-size');
  return blob;
}
export async function prepareStudioAnalysis(source:Blob,signal?:AbortSignal,runtime:Runtime=browserRuntime()){
  const image=await openPhoto(source,runtime,signal);
  try{
    const {width,height}=analysisSize(image.width,image.height);
    const {canvas,ctx}=surface(runtime,width,height);
    ctx.fillStyle='#ffffff';ctx.fillRect(0,0,width,height);ctx.drawImage(image,0,0,width,height);
    return await png(canvas,STUDIO_ANALYSIS_LIMITS.bytes,signal);
  }finally{image.close();}
}
const palette={
  premium:{top:'#f5fbff',bottom:'#cfe5fa',card:'#ffffff',text:'#102940',muted:'#32638b',accent:'#0875be'},
  classic:{top:'#ffffff',bottom:'#f4f5f6',card:'#ffffff',text:'#17212b',muted:'#495766',accent:'#2365a1'},
  cinematic:{top:'#152a43',bottom:'#09111f',card:'#253b54',text:'#ffffff',muted:'#b7d8f6',accent:'#78c5ff'}
};
function font(size:number,weight:number){return weight+' '+size+'px Arial, sans-serif';}
export async function renderStudioArtwork(source:Blob,input:StudioArtworkInput,options:{signal?:AbortSignal;transparentCutout?:boolean;runtime?:Runtime}={}){
  const layout=studioArtworkLayout(input);
  const runtime=options.runtime??browserRuntime(),signal=options.signal;
  const image=await openPhoto(source,runtime,signal);
  try{
    const {width,height,photo,text,nomi,model,template}=layout;
    const {canvas,ctx}=surface(runtime,width,height),p=palette[template];
    const gradient=ctx.createLinearGradient(0,0,width,height);
    gradient.addColorStop(0,p.top);gradient.addColorStop(1,p.bottom);
    ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
    ctx.textBaseline='top';ctx.font=font(28,700);ctx.fillStyle=p.accent;ctx.fillText('OPTOVIK N99',76,48);
    ctx.fillStyle=p.card;ctx.beginPath();ctx.roundRect(photo.x,photo.y,photo.width,photo.height,34);ctx.fill();
    const inset=options.transparentCutout===true?60:24;
    const rect=containStudioImage(image.width,image.height,{x:photo.x+inset,y:photo.y+inset,width:photo.width-2*inset,height:photo.height-2*inset});
    ctx.save();ctx.beginPath();ctx.roundRect(photo.x,photo.y,photo.width,photo.height,34);ctx.clip();
    if(options.transparentCutout===true){ctx.shadowColor='rgba(10,25,45,0.20)';ctx.shadowBlur=25;ctx.shadowOffsetY=12;}
    ctx.drawImage(image,rect.x,rect.y,rect.width,rect.height);ctx.restore();
    const measure=(value:string,size:number,weight:number)=>{ctx.font=font(size,weight);return ctx.measureText(value).width;};
    const title=fitStudioText(nomi,(s,z)=>measure(s,z,700),text.width,2,52,32);
    const fitment=fitStudioText(model,(s,z)=>measure(s,z,400),text.width,2,32,22);
    ctx.fillStyle=p.text;ctx.font=font(title.size,700);
    let y=text.y;
    for(const line of title.lines){ctx.fillText(line,text.x,y);y+=Math.ceil(title.size*1.1);}
    if(fitment.lines.length){
      y+=10;ctx.fillStyle=p.muted;ctx.font=font(fitment.size,400);
      for(const line of fitment.lines){ctx.fillText(line,text.x,y);y+=Math.ceil(fitment.size*1.15);}
    }
    if(y>height-35)return studioFail('studio-artwork-text-too-long');
    return await png(canvas,STUDIO_ARTWORK_LIMITS.bytes,signal);
  }finally{image.close();}
}
