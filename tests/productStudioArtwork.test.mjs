import test from 'node:test';
import assert from 'node:assert/strict';
import {analysisSize,containStudioImage,fitStudioText,studioArtworkLayout,studioImageMime,studioSourceSize} from '../src/domain/productStudioArtwork.ts';
import {prepareStudioAnalysis,renderStudioArtwork} from '../src/lib/productStudioCanvas.web.ts';
const reviewed={approved:true,nomi:'Moy filtri',model:'Cobalt',fitmentConfirmed:true,template:'premium',format:'square'};
test('analysis copy scales proportionally without enlargement',()=>{
 assert.deepEqual(analysisSize(4000,3000),{width:1024,height:768});
 assert.deepEqual(analysisSize(500,300),{width:500,height:300});
 assert.deepEqual(analysisSize(1,8192),{width:1,height:1024});
 for(const pair of [[0,1],[9000,1],[5000,5000],[NaN,20]])assert.throws(()=>studioSourceSize(...pair),/studio-source-dimensions/);
});
test('identifies supported byte signatures only',()=>{
 assert.equal(studioImageMime(Uint8Array.of(255,216,255)),'image/jpeg');
 assert.equal(studioImageMime(Uint8Array.of(137,80,78,71,13,10,26,10)),'image/png');
 assert.equal(studioImageMime(new TextEncoder().encode('RIFFxxxxWEBP')),'image/webp');
 assert.equal(studioImageMime(new TextEncoder().encode('<svg>')),null);
});
test('artwork contains image without cropping or stretching',()=>{
 assert.deepEqual(containStudioImage(200,100,{x:10,y:20,width:100,height:100}),{x:10,y:45,width:100,height:50});
 assert.deepEqual(containStudioImage(100,200,{x:10,y:20,width:100,height:100}),{x:35,y:20,width:50,height:100});
 assert.throws(()=>containStudioImage(0,1,{x:0,y:0,width:1,height:1}),/studio-invalid-layout/);
});
test('requires review and refuses missing or unconfirmed fitment text',()=>{
 assert.throws(()=>studioArtworkLayout({...reviewed,approved:false}),/studio-review-required/);
 assert.throws(()=>studioArtworkLayout({...reviewed,nomi:'  '}),/studio-product-name-required/);
 assert.throws(()=>studioArtworkLayout({...reviewed,model:' '}),/studio-model-required/);
 assert.equal(studioArtworkLayout({...reviewed,fitmentConfirmed:false}).model,'');
 assert.equal(studioArtworkLayout({...reviewed,fitmentConfirmed:'true'}).model,'');
});
test('all three templates and both output dimensions have non-overlapping image and text areas',()=>{
 for(const template of ['premium','classic','cinematic'])for(const format of ['square','portrait']){
  const l=studioArtworkLayout({...reviewed,template,format});
  assert.equal(l.width,1080);assert.equal(l.height,format==='portrait'?1350:1080);
  assert.ok(l.photo.y+l.photo.height<l.text.y);
 }
 assert.throws(()=>studioArtworkLayout({...reviewed,template:'other'}),/studio-invalid-template/);
});
test('measured text wraps, splits long codes and rejects overflow instead of silently clipping',()=>{
 const measure=(s,size)=>Array.from(s).length*size;
 assert.deepEqual(fitStudioText('Moy filtri',measure,60,2,10,10),{lines:['Moy','filtri'],size:10});
 assert.deepEqual(fitStudioText('ABCDEF',measure,30,2,10,10),{lines:['ABC','DEF'],size:10});
 assert.throws(()=>fitStudioText('ABCDEFGHI',measure,30,2,10,10),/studio-artwork-text-too-long/);
});
const source=new Blob([Uint8Array.of(255,216,255,1)],{type:'image/jpeg'});
function fixture(){
 const draws=[],texts=[],canvases=[];let closed=0,decoded=0;
 const ctx={fillRect(){},drawImage(...args){draws.push(args.slice(1));},createLinearGradient(){return {addColorStop(){}};},beginPath(){},roundRect(){},fill(){},save(){},clip(){},restore(){},fillText(s){texts.push(s);},measureText(s){return {width:Array.from(s).length*20};}};
 const runtime={decode:async()=>{decoded++;return {width:2000,height:1000,close(){closed++;}};},canvas:()=>{const c={width:0,height:0,getContext:()=>ctx,toBlob:cb=>cb(new Blob([Uint8Array.of(137,80,78,71,13,10,26,10)],{type:'image/png'}))};canvases.push(c);return c;}};
 return {runtime,draws,texts,canvases,counts:()=>({closed,decoded})};
}
test('analysis prepares PNG locally and releases decoded bitmap',async()=>{
 const f=fixture();const result=await prepareStudioAnalysis(source,undefined,f.runtime);
 assert.equal(result.type,'image/png');assert.deepEqual(f.draws,[[0,0,1024,512]]);
 assert.deepEqual(f.counts(),{closed:1,decoded:1});
});
test('browser engine renders approved fields only and preserves aspect ratio',async()=>{
 const f=fixture();
 await renderStudioArtwork(source,{...reviewed,fitmentConfirmed:false},{runtime:f.runtime});
 assert.deepEqual(f.texts,['OPTOVIK N99','Moy filtri']);
 assert.equal(f.draws[0][2]/f.draws[0][3],2);
 assert.equal(f.canvases[0].width,1080);assert.equal(f.canvases[0].height,1080);
 assert.deepEqual(f.counts(),{closed:1,decoded:1});
});
test('invalid type and cancelled work do not decode; failed export closes bitmap',async()=>{
 const f=fixture(),abort=new AbortController();abort.abort();
 await assert.rejects(prepareStudioAnalysis(source,abort.signal,f.runtime),/studio-cancelled/);
 await assert.rejects(prepareStudioAnalysis(new Blob(['<svg>'],{type:'image/png'}),undefined,f.runtime),/studio-source-type/);
 assert.equal(f.counts().decoded,0);
 const runtime={...f.runtime,canvas:()=>({...f.runtime.canvas(),toBlob:cb=>cb(null)})};
 await assert.rejects(prepareStudioAnalysis(source,undefined,runtime),/studio-export-failed/);
 assert.deepEqual(f.counts(),{closed:1,decoded:1});
});
