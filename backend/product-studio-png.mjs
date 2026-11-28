// Restricted canonical PNG intake for studio analysis; no external dependencies.
// Supports non-interlaced, 8-bit RGB/RGBA only. Browser preparation converts other formats.
// Filtered scanlines are decompressed, checked, and recompressed; metadata never leaves here.
export const STUDIO_PNG_LIMITS=Object.freeze({maxBytes:5*1024*1024,maxSide:1024,maxChunks:256});
const SIGNATURE=new Uint8Array([137,80,78,71,13,10,26,10]);
const table=Uint32Array.from({length:256},(_,i)=>{
  let c=i;for(let j=0;j<8;j++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);return c>>>0;
});
function crc(bytes){
  let c=0xffffffff;for(const b of bytes)c=table[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;
}
const fail=(code='invalid-image-bytes')=>{throw Object.assign(new Error(code),{code,status:400});};
function join(parts){
  const result=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));
  let at=0;for(const p of parts){result.set(p,at);at+=p.length;}return result;
}
function chunk(type,data){
  const out=new Uint8Array(data.length+12),v=new DataView(out.buffer);
  v.setUint32(0,data.length);out.set(new TextEncoder().encode(type),4);out.set(data,8);
  v.setUint32(out.length-4,crc(out.subarray(4,out.length-4)));return out;
}
async function collectBounded(stream,max){
  const reader=stream.getReader(),parts=[];let size=0;
  try{
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;
      if(size>max){void reader.cancel().catch(()=>{});fail('invalid-image-size');}
      parts.push(value);
    }
    return join(parts);
  }finally{reader.releaseLock();}
}
export async function decodeStudioPng(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length<45||bytes.length>STUDIO_PNG_LIMITS.maxBytes)fail('invalid-image-size');
  if(!SIGNATURE.every((b,i)=>bytes[i]===b))fail('invalid-image-type');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let at=8,header,width,height,stride,seenEnd=false,idatClosed=false,count=0;
  const compressed=[];
  while(at<bytes.length){
    if(++count>STUDIO_PNG_LIMITS.maxChunks||at+12>bytes.length)fail();
    const size=view.getUint32(at),end=at+12+size;
    if(end>bytes.length)fail();
    const type=String.fromCharCode(...bytes.subarray(at+4,at+8)),data=bytes.subarray(at+8,end-4);
    if(!/^[A-Za-z]{2}[A-Z][A-Za-z]$/.test(type)||crc(bytes.subarray(at+4,end-4))!==view.getUint32(end-4))fail();
    if(!header&&type!=='IHDR')fail();
    if(type==='IHDR'){
      if(header||size!==13)fail();
      width=view.getUint32(at+8);height=view.getUint32(at+12);
      if(width<1||height<1||width>STUDIO_PNG_LIMITS.maxSide||height>STUDIO_PNG_LIMITS.maxSide)fail('invalid-image-dimensions');
      if(data[8]!==8||![2,6].includes(data[9])||data[10]!==0||data[11]!==0||data[12]!==0)fail('invalid-image-type');
      header=data;stride=1+width*(data[9]===6?4:3);
    }else if(type==='IDAT'){
      if(idatClosed)fail();
      compressed.push(data);
    }else if(type==='IEND'){
      if(size!==0||!compressed.length||end!==bytes.length)fail();
      seenEnd=true;break;
    }else{
      if(compressed.length)idatClosed=true;
      // Refuse animation, transparency overrides and unknown critical chunks.
      // Ancillary metadata is discarded; optional suggested palette is not needed for RGB/RGBA.
      if(['acTL','fcTL','fdAT','tRNS'].includes(type)||(/^[A-Z]/.test(type)&&type!=='PLTE'))fail('invalid-image-type');
    }
    at=end;
  }
  if(!header||!seenEnd||!compressed.length)fail();
  const expected=stride*height;
  let raw;
  try{
    raw=await collectBounded(new Blob(compressed).stream().pipeThrough(new DecompressionStream('deflate')),expected);
  }catch(e){if(e?.code==='invalid-image-size')throw e;fail();}
  if(raw.length!==expected)fail();
  for(let i=0;i<raw.length;i+=stride)if(raw[i]>4)fail();
  // Recompression removes any unused/trailing compressed input, and keeps exact filtered pixel data.
  let zipped;
  try{
    zipped=await collectBounded(new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate')),STUDIO_PNG_LIMITS.maxBytes-57);
  }catch(e){if(e?.code==='invalid-image-size')throw e;fail();}
  const output=join([SIGNATURE,chunk('IHDR',header),chunk('IDAT',zipped),chunk('IEND',new Uint8Array())]);
  return {bytes:output,meta:{mime:'image/png',bytes:output.length,width,height}};
}
