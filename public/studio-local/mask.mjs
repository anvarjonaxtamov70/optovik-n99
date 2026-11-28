// BiRefNet Lite 512 input/output contract, no network or browser dependencies.
export const MODEL_SIDE=512;
export const MODEL_BYTES=101066931;
export const MODEL_SHA256='20e3fb3e7bbb75e0b4f152759413a6ab19a599a1c2e1db7ce7741792eaf639fb';
const mean=[.485,.456,.406],std=[.229,.224,.225];
export function prepareTensor(rgba,side=MODEL_SIDE){
  if(!Number.isSafeInteger(side)||side<1||side>MODEL_SIDE||!(rgba instanceof Uint8ClampedArray)||rgba.length!==side*side*4)throw Error('studio-mask-input');
  const n=side*side,out=new Float32Array(n*3);
  for(let i=0;i<n;i++)for(let c=0;c<3;c++)out[c*n+i]=(rgba[i*4+c]/255-mean[c])/std[c];
  return out;
}
export function logitsToMask(logits,side=MODEL_SIDE){
  if(!Number.isSafeInteger(side)||side<1||side>MODEL_SIDE||!(logits instanceof Float32Array)||logits.length!==side*side)throw Error('studio-mask-output');
  const out=new Float32Array(logits.length);let foreground=0;
  for(let i=0;i<logits.length;i++){
    if(!Number.isFinite(logits[i]))throw Error('studio-mask-output');
    out[i]=1/(1+Math.exp(-logits[i]));if(out[i]>=.5)foreground++;
  }
  // No confident foreground or almost all foreground: require manual fallback/review.
  if(foreground/out.length<.005||foreground/out.length>.995)throw Error('studio-mask-uncertain');
  return out;
}
export function applyStudioMask(rgba,width,height,mask,side=MODEL_SIDE){
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>1600||height>1600||!(rgba instanceof Uint8ClampedArray)||rgba.length!==width*height*4||!Number.isSafeInteger(side)||side<1||side>MODEL_SIDE||!(mask instanceof Float32Array)||mask.length!==side*side||mask.some(v=>!Number.isFinite(v)||v<0||v>1))throw Error('studio-mask-output');
  const output=new Uint8ClampedArray(rgba);
  for(let y=0;y<height;y++){
    const sy=Math.max(0,Math.min(side-1,(y+.5)*side/height-.5)),y0=Math.floor(sy),y1=Math.min(side-1,y0+1),fy=sy-y0;
    for(let x=0;x<width;x++){
      const sx=Math.max(0,Math.min(side-1,(x+.5)*side/width-.5)),x0=Math.floor(sx),x1=Math.min(side-1,x0+1),fx=sx-x0;
      const a=(mask[y0*side+x0]*(1-fx)+mask[y0*side+x1]*fx)*(1-fy)+(mask[y1*side+x0]*(1-fx)+mask[y1*side+x1]*fx)*fy;
      const i=(y*width+x)*4+3;output[i]=Math.round(rgba[i]*a);
    }
  }
  return output;
}
