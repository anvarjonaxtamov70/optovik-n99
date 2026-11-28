import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutQuote, assertQuoteMatches, readQuoteProduct } from '../src/domain/checkoutQuote.ts';
const settings = { pickupEnabled: true, courierEnabled: true, courierFee: 10, freeDeliveryFrom: 0 };
const request = [{id:'a/b',qty:1},{id:'a/c',qty:1}];
test('fresh quote detects individual price changes even when total is unchanged', () => {
 const catalog = new Map([['a/b',{narxi:20,qoldiq:2}],['a/c',{narxi:10,qoldiq:2}]]);
 const quote = checkoutQuote(request,catalog,settings,'olib');
 const displayed = {subtotal:30,count:2,delivery:0,total:30,lines:2};
 assert.doesNotThrow(()=>assertQuoteMatches(quote,displayed,new Map([['a/b',20],['a/c',10]])));
 assert.throws(()=>assertQuoteMatches(quote,displayed,new Map([['a/b',10],['a/c',20]])));
 assert.throws(()=>assertQuoteMatches(quote,{...displayed,delivery:10,total:40},new Map([['a/b',20],['a/c',10]])));
});
test('fresh quote rejects malformed and archived inventory', () => {
 assert.throws(()=>readQuoteProduct({narxi:1.5,qoldiq:2}));
 assert.throws(()=>readQuoteProduct(null));
 const product = readQuoteProduct({narxi:10,qoldiq:2,archived:true});
 assert.throws(()=>checkoutQuote([request[0]],new Map([['a/b',product]]),settings,'olib'));
});
