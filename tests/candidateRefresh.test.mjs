import test from 'node:test';
import assert from 'node:assert/strict';
import {notifyCandidateRefresh,subscribeCandidateRefresh} from '../src/lib/candidateRefresh.ts';
test('a broken view cannot interrupt committed acknowledgement or other listeners',()=>{
 const event={actor:'admin',uid:'customer',id:'synthetic',inventoryMayChange:true};
 const seen=[];
 const bad=subscribeCandidateRefresh(()=>{throw Error('view error');});
 const good=subscribeCandidateRefresh(e=>seen.push(e));
 try{assert.doesNotThrow(()=>notifyCandidateRefresh(event));assert.deepEqual(seen,[event]);}
 finally{bad();good();}
 notifyCandidateRefresh(event);
 assert.equal(seen.length,1);
});
