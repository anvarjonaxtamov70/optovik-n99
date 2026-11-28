import assert from 'node:assert/strict';
import test from 'node:test';
import { checkoutQuote } from '../src/domain/checkoutQuote.ts';

const catalog = new Map([['motor/filter', { narxi: 45000, qoldiq: 12 }], ['motor/belt', { narxi: 10000, qoldiq: 3 }]]);
const settings = { pickupEnabled: true, courierEnabled: true, courierFee: 15000, freeDeliveryFrom: 100000 };
const line = { id: 'motor/filter', qty: 2 };

test('quote calculates catalog prices and delivery', () => {
  const quote = checkoutQuote([line], catalog, settings, 'kuryer');
  assert.equal(quote.subtotal, 90000);
  assert.equal(quote.count, 2);
  assert.equal(quote.delivery, 15000);
  assert.equal(quote.total, 105000);
});
test('quote free delivery at exact threshold', () => {
  assert.equal(checkoutQuote([line, { id: 'motor/belt', qty: 1 }], catalog, settings, 'kuryer').total, 100000);
});
test('quote pickup and disabled delivery', () => {
  assert.equal(checkoutQuote([line], catalog, settings, 'olib').delivery, 0);
  assert.throws(() => checkoutQuote([line], catalog, { ...settings, courierEnabled: false }, 'kuryer'), /delivery-disabled/);
  assert.throws(() => checkoutQuote([line], catalog, { ...settings, pickupEnabled: false }, 'olib'), /delivery-disabled/);
});
test('quote rejects invalid quantities and duplicate lines', () => {
  for (const qty of [0, -1, 1.5, NaN, 1000]) assert.throws(() => checkoutQuote([{ ...line, qty }], catalog, settings, 'olib'), /invalid-item/);
  assert.throws(() => checkoutQuote([line, line], catalog, settings, 'olib'), /invalid-item/);
});
test('quote rejects unavailable stock and empty cart', () => {
  assert.throws(() => checkoutQuote([{ ...line, qty: 13 }], catalog, settings, 'olib'), /stock-unavailable/);
  assert.throws(() => checkoutQuote([], catalog, settings, 'olib'), /invalid-cart/);
});
test('quote rejects invalid catalog and settings', () => {
  assert.throws(() => checkoutQuote([line], new Map([[line.id, { narxi: -1, qoldiq: 12 }]]), settings, 'olib'), /invalid-price/);
  assert.throws(() => checkoutQuote([line], catalog, { ...settings, courierFee: -1 }, 'kuryer'), /invalid-settings/);
});
