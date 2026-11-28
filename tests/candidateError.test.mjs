import test from 'node:test';
import assert from 'node:assert/strict';
import {safeCandidateError,adminTransitionErrorKey} from '../src/domain/candidateError.ts';
test('stock, permission and stale order conflicts have distinct safe messages',()=>{
 assert.equal(adminTransitionErrorKey({candidateError:'stock-unavailable'}),'admin.stockError');
 assert.equal(adminTransitionErrorKey({candidateError:'order-changed'}),'admin.orderConflict');
 assert.equal(adminTransitionErrorKey({candidateError:'forbidden'}),'admin.err.permission');
 assert.equal(safeCandidateError('private upstream body'),undefined);
 assert.equal(adminTransitionErrorKey({candidateError:{secret:'test'}}),undefined);
});
