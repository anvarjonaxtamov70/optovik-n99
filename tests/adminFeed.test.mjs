import test from 'node:test';
import assert from 'node:assert/strict';
import {adminFeedLimit,selectAdminFeed,patchAdminFeed} from '../src/domain/adminFeed.ts';
test('one feed retains each previous consumer limit without polling all 500 on detail screens',()=>{
 assert.equal(adminFeedLimit('/admin/orders',false),500);
 assert.equal(adminFeedLimit('/admin/orders/',true),500);
 assert.equal(adminFeedLimit('/admin',false),300);
 assert.equal(adminFeedLimit('/admin/order/customer/id',false),20);
 assert.equal(adminFeedLimit('/admin/products',true),300);
});
const orders=[{id:'a',uid:'customer',holat:'yangi'},{id:'b',uid:'other',holat:'yangi'}];
const feed={actor:'admin',orders,limit:300,loading:false,error:false};
test('navigation can reuse a complete snapshot and never exposes another account',()=>{
 assert.deepEqual(selectAdminFeed(feed,'admin',500),{orders,loading:false,error:false});
 assert.deepEqual(selectAdminFeed(feed,'other',500),{orders:[],loading:true,error:false});
 assert.deepEqual(selectAdminFeed(feed,null,500),{orders:[],loading:false,error:false});
 assert.equal(selectAdminFeed({...feed,limit:2},'admin',500).loading,true);
 assert.deepEqual(selectAdminFeed(feed,'admin',1).orders,[orders[0]]);
});
test('confirmed transition patches only the matching order and actor',()=>{
 assert.equal(patchAdminFeed(feed,'other',{id:'a',uid:'customer',holat:'bekor'}),feed);
 const next=patchAdminFeed(feed,'admin',{id:'a',uid:'customer',holat:'bekor'});
 assert.equal(next.orders[0].holat,'bekor');assert.equal(next.orders[1],orders[1]);assert.equal(feed.orders[0].holat,'yangi');
 assert.deepEqual(patchAdminFeed(feed,'admin',{id:'a',uid:'other',holat:'bekor'}).orders,orders);
});
