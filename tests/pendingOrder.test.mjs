import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePendingOrder } from '../src/domain/pendingOrder.ts';
test('pending order metadata is strictly validated for checkout and recovery', () => {
 const id = '-1234567890123456789';
 assert.deepEqual(parsePendingOrder({id,raqam:123456}),{id,raqam:123456});
 for (const raw of [null, [], {}, {id:123,raqam:123456},{id,raqam:'123456'},{id,raqam:99999},{id,raqam:1000000},{id,raqam:123456.5},{id:'bad/path',raqam:123456}]) assert.equal(parsePendingOrder(raw),null);
});
