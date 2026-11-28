import test from 'node:test';
import assert from 'node:assert/strict';
import {readStudioAnalysis,appendStudioImage} from '../src/domain/productStudioDraft.ts';
const draft={nomi:'Filtr',brend:'GM',artikul:'123',modelSuggestion:'Cobalt',tavsifUz:'Filtr',tavsifRu:'Фильтр',requiresReview:true};
const quota={remainingGlobal:19,remainingAdmin:4};
test('analysis response whitelists draft fields and never copies price or stock',()=>{
 assert.deepEqual(readStudioAnalysis({draft:{...draft,narxi:1,qoldiq:500,model:'Gentra'},quota}),{draft,quota});
});
test('rejects malformed, unreviewed, too long and control-containing responses',()=>{
 for(const d of [{...draft,requiresReview:false},{...draft,nomi:3},{...draft,artikul:'x'.repeat(81)},{...draft,modelSuggestion:'a\u202eb'}])assert.throws(()=>readStudioAnalysis({draft:d,quota}),/studio-invalid-response/);
 for(const q of [{remainingGlobal:-1,remainingAdmin:1},{remainingGlobal:21,remainingAdmin:1},{remainingGlobal:1,remainingAdmin:'1'}])assert.throws(()=>readStudioAnalysis({draft,quota:q}),/studio-invalid-response/);
});
test('attachment preserves existing image order and never evicts original or exceeds candidate limit',()=>{
 const images=['https://example.test/original.png'],url='https://example.test/ad.png';
 assert.deepEqual(appendStudioImage(images,url,8),[...images,url]);assert.equal(images.length,1);
 assert.equal(appendStudioImage(images,url,1),images);assert.equal(appendStudioImage(images,images[0],8),images);
 assert.equal(appendStudioImage(images,'http://bad.test/ad.png',8),images);
});
