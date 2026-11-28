import test from 'node:test';
import assert from 'node:assert/strict';
import {deflateSync,inflateSync} from 'node:zlib';
import {decodeStudioPng,STUDIO_PNG_LIMITS} from '../backend/product-studio-png.mjs';
const signature=Buffer.from([137,80,78,71,13,10,26,10]);
// Independent slow CRC fixture generator; no shared production helper.
function chunk(name,data=Buffer.alloc(0)){
  const body=Buffer.concat([Buffer.from(name),data]);let crc=0xffffffff;
  for(const byte of body){crc^=byte;for(let i=0;i<8;i++)crc=(crc&1)?(crc>>>1)^0xedb88320:crc>>>1;}
  const start=Buffer.alloc(4),end=Buffer.alloc(4);start.writeUInt32BE(data.length);end.writeUInt32BE((crc^0xffffffff)>>>0);
  return Buffer.concat([start,body,end]);
}
function header(w=2,h=1,color=6,depth=8,interlace=0){
  const b=Buffer.alloc(13);b.writeUInt32BE(w);b.writeUInt32BE(h,4);b[8]=depth;b[9]=color;b[12]=interlace;return chunk('IHDR',b);
}
const rgba=Buffer.from([0,255,0,0,255,0,255,0,255]);
const rgb=Buffer.from([0,255,0,0,0,255,0]);
const pack=(...chunks)=>Buffer.concat([signature,...chunks]);
const idat=raw=>chunk('IDAT',deflateSync(raw));
const end=()=>chunk('IEND');
const sample=()=>pack(header(),idat(rgba),end());
const reject=(bytes,code)=>assert.rejects(decodeStudioPng(bytes),code?{code}:undefined);
function readOutput(bytes){
  const b=Buffer.from(bytes),types=[],data=[];let i=8;
  while(i<b.length){const n=b.readUInt32BE(i),type=b.toString('ascii',i+4,i+8);types.push(type);if(type==='IDAT')data.push(b.subarray(i+8,i+8+n));i+=12+n;}
  return {types,raw:inflateSync(Buffer.concat(data))};
}
test('real RGBA and RGB scanlines are preserved in canonical PNG',async()=>{
  for(const [color,pixels] of [[6,rgba],[2,rgb]]){
    const input=pack(header(2,1,color),idat(pixels),end()),output=await decodeStudioPng(input);
    assert.deepEqual(output.meta,{mime:'image/png',bytes:output.bytes.length,width:2,height:1});
    assert.deepEqual(readOutput(output.bytes),{types:['IHDR','IDAT','IEND'],raw:pixels});
  }
});
test('metadata is stripped and split consecutive IDAT chunks are accepted',async()=>{
  const z=deflateSync(rgba);
  const input=pack(header(),chunk('tEXt',Buffer.from('GPS\0private coordinates')),chunk('IDAT',z.subarray(0,5)),chunk('IDAT',z.subarray(5)),chunk('eXIf',Buffer.from('private')),end());
  const out=await decodeStudioPng(input);
  assert.deepEqual(readOutput(out.bytes),{types:['IHDR','IDAT','IEND'],raw:rgba});
  assert.equal(Buffer.from(out.bytes).includes(Buffer.from('private')),false);
});
test('rejects oversized files and dimensions before decompression',async()=>{
  await reject(new Uint8Array(STUDIO_PNG_LIMITS.maxBytes+1),'invalid-image-size');
  for(const w of [0,1025,4294967295])await reject(pack(header(w),idat(rgba),end()),'invalid-image-dimensions');
});
test('rejects unsupported color depth, palette, interlace and animated PNG',async()=>{
  for(const h of [header(2,1,3),header(2,1,6,16),header(2,1,6,8,1)])await reject(pack(h,idat(rgba),end()),'invalid-image-type');
  for(const name of ['acTL','fcTL','fdAT','tRNS','ABCD'])await reject(pack(header(),chunk(name),idat(rgba),end()),'invalid-image-type');
});
test('rejects false signatures, bad CRC, truncation and trailing data',async()=>{
  const wrong=sample();wrong[0]=0;await reject(wrong,'invalid-image-type');
  const corrupt=sample();corrupt[29]^=1;await reject(corrupt,'invalid-image-bytes');
  await reject(sample().subarray(0,-1),'invalid-image-bytes');
  await reject(Buffer.concat([sample(),Buffer.from('junk')]),'invalid-image-bytes');
});
test('rejects chunk ordering, missing IDAT, duplicate header and excessive chunks',async()=>{
  await reject(pack(idat(rgba),header(),end()),'invalid-image-bytes');
  await reject(pack(header(),header(),idat(rgba),end()),'invalid-image-bytes');
  await reject(pack(header(),end()));
  await reject(pack(header(),idat(rgba),chunk('tEXt'),idat(rgba),end()),'invalid-image-bytes');
  await reject(pack(header(),...Array.from({length:256},()=>chunk('tEXt')),idat(rgba),end()),'invalid-image-bytes');
});
test('rejects corrupt zlib and invalid or short filtered scanlines',async()=>{
  await reject(pack(header(),chunk('IDAT',Buffer.from('not zlib')),end()),'invalid-image-bytes');
  await reject(pack(header(),idat(rgba.subarray(0,-1)),end()),'invalid-image-bytes');
  const wrong=Buffer.from(rgba);wrong[0]=5;
  await reject(pack(header(),idat(wrong),end()),'invalid-image-bytes');
});
test('decompression expansion is bounded by declared dimensions',async()=>{
  await reject(pack(header(),idat(Buffer.alloc(1024*1024)),end()),'invalid-image-size');
});
test('supports all five filter identifiers without changing scanline bytes',async()=>{
  const raw=Buffer.concat(Array.from({length:5},(_,i)=>Buffer.from([i,1,2,3,4])));
  const out=await decodeStudioPng(pack(header(1,5),idat(raw),end()));
  assert.deepEqual(readOutput(out.bytes).raw,raw);
});
