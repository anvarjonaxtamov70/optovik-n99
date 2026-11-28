import test from 'node:test';
import assert from 'node:assert/strict';
import { assertFulfillableOrder } from '../src/domain/order.ts';
const item = {id:'a/b',nomi:'Synthetic',narxi:100,soni:2};
const order = {items:[item],yetkazishNarxi:10,summa:200,jami:210,soni:2};
test('fulfillment accepts consistent integer order totals',()=>assert.doesNotThrow(()=>assertFulfillableOrder(order)));
test('fulfillment rejects malformed lines and inconsistent totals',()=>{
 for(const value of [{...order,jami:211},{...order,yetkazishNarxi:-10,jami:190},{...order,items:[{...item,narxi:100.5}],summa:201,jami:211},{...order,items:[item,item],summa:400,jami:410,soni:4},{...order,items:[{...item,soni:0}],summa:0,jami:10,soni:0}]) assert.throws(()=>assertFulfillableOrder(value));
});
