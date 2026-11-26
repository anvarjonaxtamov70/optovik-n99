import test from 'node:test';
import assert from 'node:assert/strict';
import { readQuoteProduct, checkoutQuote } from '../src/domain/checkoutQuote.ts';
test('checkout rejects malformed archive metadata',()=>assert.throws(()=>readQuoteProduct({narxi:100,qoldiq:1,archived:'true'})));
test('checkout rejects unsafe aggregate arithmetic',()=>assert.throws(()=>checkoutQuote([{id:'a/b',qty:2}],new Map([['a/b',{narxi:Number.MAX_SAFE_INTEGER,qoldiq:2}]]),{pickupEnabled:true,courierEnabled:true,courierFee:0,freeDeliveryFrom:0},'olib')));
