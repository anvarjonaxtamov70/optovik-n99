import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileCandidateTransition} from '../src/domain/candidateTransition.ts';
const prior={id:'order',uid:'customer',raqam:123456,holat:'yangi',updatedAt:10,tarix:{yangi:10},items:[{}],zaxira:false};
const confirmed={...prior,holat:'tasdiqlandi',updatedAt:11,tarix:{...prior.tarix,tasdiqlandi:11},zaxira:true};
test('ambiguous write is reconciled only using an authoritative matching committed snapshot',async()=>{
 let reads=0;
 const result=await reconcileCandidateTransition(prior,'tasdiqlandi',async()=>{reads++;return confirmed;},()=>true);
 assert.equal(result,confirmed);assert.equal(reads,1);
 for(const bad of [prior,{...confirmed,uid:'other'},{...confirmed,id:'other'},{...confirmed,raqam:999999},{...confirmed,zaxira:false},{...confirmed,updatedAt:9},{...confirmed,tarix:{}},null]){
  assert.equal(await reconcileCandidateTransition(prior,'tasdiqlandi',async()=>bad,()=>true),null);
 }
 assert.equal(await reconcileCandidateTransition(prior,'tasdiqlandi',async()=>{throw Error('offline');},()=>true),null);
});
test('cancel acknowledgement requires released reservation and discards switched accounts',async()=>{
 const cancelled={...confirmed,holat:'bekor',updatedAt:12,tarix:{...confirmed.tarix,bekor:12},zaxira:false};
 assert.equal(await reconcileCandidateTransition(confirmed,'bekor',async()=>cancelled,()=>true),cancelled);
 assert.equal(await reconcileCandidateTransition(confirmed,'bekor',async()=>({...cancelled,zaxira:true}),()=>true),null);
 let active=true;
 assert.equal(await reconcileCandidateTransition(confirmed,'bekor',async()=>{active=false;return cancelled;},()=>active),null);
});
