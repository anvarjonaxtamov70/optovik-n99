import test from 'node:test';
import assert from 'node:assert/strict';
import {STUDIO_LIMITS, validateStudioImage, normalizeStudioDraft, studioArtworkText} from '../backend/product-studio-policy.mjs';

const image = {mime:'image/jpeg', bytes:1024, width:1200, height:900};
test('studio accepts supported decoded image metadata', () => {
  for (const mime of ['image/jpeg','image/png','image/webp']) assert.equal(validateStudioImage({...image,mime}),null);
  assert.equal(validateStudioImage({...image,bytes:STUDIO_LIMITS.maxBytes}),null);
});
test('studio rejects unknown formats and missing metadata', () => {
  for (const mime of ['image/svg+xml','image/gif','text/html','']) assert.equal(validateStudioImage({...image,mime}),'invalid-image-type');
  assert.equal(validateStudioImage(null),'invalid-image-type');
});
test('studio rejects oversized and invalid byte counts', () => {
  for (const bytes of [0,-1,NaN,Infinity,1.5,'100',STUDIO_LIMITS.maxBytes+1]) assert.equal(validateStudioImage({...image,bytes}),'invalid-image-size');
});
test('studio rejects invalid dimensions and pixel bombs', () => {
  for (const width of [0,-1,NaN,Infinity,1.5,8193,'200']) assert.equal(validateStudioImage({...image,width}),'invalid-image-dimensions');
  assert.equal(validateStudioImage({...image,width:5000,height:5000}),'invalid-image-dimensions');
  assert.equal(validateStudioImage({...image,width:5000,height:4000}),null);
});
test('studio drafts whitelist fields and never change price stock or fitment', () => {
  const draft=normalizeStudioDraft({nomi:' Moy filtri ',brend:'GM',artikul:'1234',modelSuggestion:'Cobalt',model:'Gentra',narxi:1,qoldiq:999,requiresReview:false,admin:true});
  assert.deepEqual(draft,{nomi:'Moy filtri',brend:'GM',artikul:'1234',modelSuggestion:'Cobalt',tavsifUz:'',tavsifRu:'',requiresReview:true});
});
test('studio rejects malformed and overlong AI values without coercion', () => {
  const empty=normalizeStudioDraft(null);
  assert.deepEqual(normalizeStudioDraft([]),empty);
  assert.deepEqual(normalizeStudioDraft({nomi:42,brend:'x'.repeat(61),artikul:'A\u0000B',modelSuggestion:'x'.repeat(301),tavsifUz:{},tavsifRu:'x\u202e'}),empty);
});
test('artwork never includes unconfirmed model or AI suggestion', () => {
  for (const fitmentConfirmed of [false,undefined,'true',1]) assert.deepEqual(studioArtworkText({nomi:'Filtr',model:'Cobalt',modelSuggestion:'Gentra',fitmentConfirmed,template:'premium'}),{nomi:'Filtr',model:'',template:'premium'});
});
test('artwork accepts explicitly reviewed text and known templates only', () => {
  for (const template of ['premium','classic','cinematic']) assert.deepEqual(studioArtworkText({nomi:'Filtr',model:'Cobalt',fitmentConfirmed:true,template}),{nomi:'Filtr',model:'Cobalt',template});
  assert.equal(studioArtworkText({nomi:'Filtr',template:'unknown'}),null);
  assert.equal(studioArtworkText({nomi:'',template:'classic'}),null);
  assert.equal(studioArtworkText(null),null);
});
