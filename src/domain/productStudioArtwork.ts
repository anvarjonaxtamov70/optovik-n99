// Pure layout and review policy. No browser, provider or catalog dependencies.
export type StudioTemplate = 'premium' | 'classic' | 'cinematic';
export type StudioFormat = 'square' | 'portrait';
export type StudioArtworkInput = {
  approved: boolean; nomi: string; model: string; fitmentConfirmed: boolean;
  template: StudioTemplate; format: StudioFormat;
};
export type StudioRect = {x:number;y:number;width:number;height:number};
export const STUDIO_SOURCE_LIMITS = Object.freeze({bytes:15*1024*1024,side:8192,pixels:20_000_000});
export const STUDIO_ANALYSIS_LIMITS = Object.freeze({bytes:5*1024*1024,side:1024});
export const STUDIO_ARTWORK_LIMITS = Object.freeze({bytes:10*1024*1024});
const invalidText=/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
export const studioFail=(code:string):never=>{throw new Error(code);};
function clean(value:unknown,limit:number):string{
  if(typeof value!=='string'||invalidText.test(value)||value.trim().length>limit)return '';
  return value.trim();
}
export function studioImageMime(header:Uint8Array):string|null{
  if(header.length>=3&&header[0]===255&&header[1]===216&&header[2]===255)return 'image/jpeg';
  if(header.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>header[i]===v))return 'image/png';
  if(header.length>=12&&String.fromCharCode(...header.subarray(0,4))==='RIFF'&&String.fromCharCode(...header.subarray(8,12))==='WEBP')return 'image/webp';
  return null;
}
export function studioSourceSize(width:number,height:number):void{
  if(![width,height].every(v=>Number.isSafeInteger(v)&&v>0&&v<=STUDIO_SOURCE_LIMITS.side)||width*height>STUDIO_SOURCE_LIMITS.pixels)studioFail('studio-source-dimensions');
}
export function analysisSize(width:number,height:number){
  studioSourceSize(width,height);
  const scale=Math.min(1,STUDIO_ANALYSIS_LIMITS.side/Math.max(width,height));
  return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
export function containStudioImage(width:number,height:number,box:StudioRect):StudioRect{
  if(![width,height,box.width,box.height].every(v=>Number.isFinite(v)&&v>0)||![box.x,box.y].every(Number.isFinite))return studioFail('studio-invalid-layout');
  const scale=Math.min(box.width/width,box.height/height),w=width*scale,h=height*scale;
  return {x:box.x+(box.width-w)/2,y:box.y+(box.height-h)/2,width:w,height:h};
}
export function studioArtworkLayout(input:StudioArtworkInput){
  if(!input||input.approved!==true)return studioFail('studio-review-required');
  if(!['premium','classic','cinematic'].includes(input.template)||!['square','portrait'].includes(input.format))return studioFail('studio-invalid-template');
  const nomi=clean(input.nomi,160);
  if(!nomi)return studioFail('studio-product-name-required');
  const model=input.fitmentConfirmed===true?clean(input.model,300):'';
  if(input.fitmentConfirmed===true&&!model)return studioFail('studio-model-required');
  const height=input.format==='portrait'?1350:1080;
  return {width:1080,height,nomi,model,template:input.template,
    photo:{x:64,y:126,width:952,height:height-422},
    text:{x:76,y:height-265,width:928,height:190}};
}
// Wrap by words, then by Unicode code points for long part numbers. No silent ellipsis.
export function fitStudioText(value:string,measure:(line:string,size:number)=>number,width:number,maxLines:number,maxSize:number,minSize:number){
  if(!value)return {lines:[] as string[],size:maxSize};
  if(!Number.isSafeInteger(maxLines)||maxLines<1||!Number.isSafeInteger(maxSize)||!Number.isSafeInteger(minSize)||minSize<1||maxSize<minSize||!Number.isFinite(width)||width<=0)return studioFail('studio-invalid-layout');
  for(let size=maxSize;size>=minSize;size-=2){
    const lines:string[]=[];let line='',invalid=false;
    for(const word of value.split(/\s+/u)){
      const joined=line?line+' '+word:word;
      if(measure(joined,size)<=width){line=joined;continue;}
      if(line){lines.push(line);line='';}
      for(const ch of Array.from(word)){
        if(measure(ch,size)>width){invalid=true;break;}
        if(line&&measure(line+ch,size)>width){lines.push(line);line=ch;}
        else line+=ch;
      }
      if(invalid||lines.length>=maxLines)break;
    }
    if(line)lines.push(line);
    if(!invalid&&lines.length<=maxLines&&lines.every(l=>measure(l,size)<=width))return {lines,size};
  }
  return studioFail('studio-artwork-text-too-long');
}
