import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { cartLines, cartSummary, filterProducts, initialShopState, readProducts, shopReducer } from '../src/store/shop.ts';

const raw = {
  motor: {
    '001': { nomi: '  Moy FILTRI  ', narxi: 150000, qoldiq: 3 },
    '002': { nomi: 'Svecha', narxi: 25000, qoldiq: 0 },
  },
  kuzov: { '001': { nomi: 'Havo filtri', narxi: 80000, qoldiq: 2 } },
};
const products = readProducts(raw);
const loaded = () => shopReducer(initialShopState, { type: 'products', products, message: '' });
const change = (state, id, delta = 1) => shopReducer(state, { type: 'quantity', id, delta });
const update = (state, nextProducts) => shopReducer(state, { type: 'products', products: nextProducts, message: '' });

test('existing baza.json category/product structure is supported without changes', () => {
  const fixture = JSON.parse(readFileSync(new URL('../baza.json', import.meta.url), 'utf8'));
  const parsed = readProducts(fixture.tovarlar);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].id, 'kategoriya_1/001');
  assert.equal(parsed[0].narxi, 150000);
  assert.equal(parsed[0].qoldiq, 10);
});

test('name search ignores surrounding spaces and case and supports partial matches', () => {
  assert.deepEqual(filterProducts(products, '  fIlTr  ', null).map((p) => p.id), ['motor/001', 'kuzov/001']);
  assert.equal(filterProducts(products, '   ', null).length, 3);
  assert.equal(filterProducts(products, 'no-such-product', null).length, 0);
});

test('category filter combines with search and all shows both categories', () => {
  assert.deepEqual(filterProducts(products, 'filtr', 'kuzov').map((p) => p.id), ['kuzov/001']);
  assert.equal(filterProducts(products, '', 'motor').length, 2);
  assert.equal(filterProducts(products, '', null).length, 3);
});

test('zero stock cannot be added and repeated taps never exceed available stock', () => {
  let state = loaded();
  state = change(state, 'motor/002');
  state = change(state, 'missing/id');
  assert.deepEqual(state.quantities, {});
  for (let i = 0; i < 20; i++) state = change(state, 'motor/001');
  assert.equal(state.quantities['motor/001'], 3);
  assert.deepEqual(cartSummary(state), { count: 3, total: 450000 });
  assert.equal(raw.motor['001'].qoldiq, 3);
});

test('same product IDs in different categories stay independent; decrease and removal update totals', () => {
  let state = change(change(change(loaded(), 'motor/001'), 'motor/001'), 'kuzov/001');
  assert.deepEqual(cartSummary(state), { count: 3, total: 380000 });
  state = change(state, 'motor/001', -1);
  assert.deepEqual(cartSummary(state), { count: 2, total: 230000 });
  state = shopReducer(state, { type: 'remove', id: 'motor/001' });
  assert.deepEqual(cartSummary(state), { count: 1, total: 80000 });
  state = shopReducer(state, { type: 'remove', id: 'kuzov/001' });
  assert.deepEqual(cartLines(state), []);
  assert.deepEqual(cartSummary(state), { count: 0, total: 0 });
});

test('live price updates change cart totals immediately without changing quantity', () => {
  let state = change(change(loaded(), 'motor/001'), 'motor/001');
  state = update(state, products.map((p) => p.id === 'motor/001' ? { ...p, narxi: 175000 } : p));
  assert.deepEqual(cartSummary(state), { count: 2, total: 350000 });
  assert.equal(state.cartNotice, '');
});

test('live stock reductions cap quantities and deletion or zero stock removes cart entries', () => {
  let state = change(change(change(loaded(), 'motor/001'), 'motor/001'), 'kuzov/001');
  state = update(state, products.map((p) => p.id === 'motor/001' ? { ...p, qoldiq: 1 } : p));
  assert.deepEqual(state.quantities, { 'motor/001': 1, 'kuzov/001': 1 });
  assert.ok(state.cartNotice);
  state = update(state, products.filter((p) => p.id !== 'kuzov/001').map((p) => ({ ...p, qoldiq: 0 })));
  assert.deepEqual(state.quantities, {});
  assert.deepEqual(cartSummary(state), { count: 0, total: 0 });
  state = update(state, products);
  assert.deepEqual(state.quantities, {});
});

test('temporarily failed loading preserves cart and prevents increases until a successful retry', () => {
  let state = change(change(loaded(), 'motor/001'), 'motor/001');
  for (const type of ['error', 'loading', 'slow']) {
    state = shopReducer(state, { type });
    state = change(state, 'motor/001');
    assert.equal(state.quantities['motor/001'], 2);
  }
  state = change(state, 'motor/001', -1);
  assert.equal(state.quantities['motor/001'], 1);
  state = change(update(state, products), 'motor/001');
  assert.equal(state.quantities['motor/001'], 2);
});

test('invalid records are ignored and stock becomes a non-negative integer', () => {
  assert.deepEqual(readProducts(null), []);
  assert.deepEqual(readProducts('invalid'), []);
  const parsed = readProducts({ category: {
    blank: { nomi: ' ', narxi: 1, qoldiq: 2 },
    badPrice: { nomi: 'X', narxi: -1, qoldiq: 2 },
    infinity: { nomi: 'X', narxi: Infinity, qoldiq: 2 },
    badStock: { nomi: 'X', narxi: 1, qoldiq: NaN },
    stringPrice: { nomi: 'X', narxi: '10', qoldiq: 2 },
    negativeStock: { nomi: 'X', narxi: 0, qoldiq: -3 },
    fractionalStock: { nomi: 'Y', narxi: 1, qoldiq: 2.8 },
  } });
  assert.deepEqual(parsed.map((p) => [p.id, p.qoldiq]), [['category/negativeStock', 0], ['category/fractionalStock', 2]]);
});


test('restored cart waits for live catalog and then clamps removed or reduced stock', () => {
  let state = shopReducer(initialShopState, { type: 'restore', quantities: { 'motor/001': 7, 'old/deleted': 2, 'motor/002': -1, 'bad/path/extra': 2, 'motor/999': '3' } });
  assert.deepEqual(state.quantities, { 'motor/001': 7, 'old/deleted': 2 });
  assert.equal(state.status, 'loading');
  state = update(state, products);
  assert.deepEqual(state.quantities, { 'motor/001': 3 });
  assert.ok(state.cartNotice);
});

test('acknowledging an order removes submitted quantities while keeping other cart items', () => {
  let state = change(change(change(loaded(), 'motor/001'), 'motor/001'), 'kuzov/001');
  state = shopReducer(state, { type: 'ordered', quantities: { 'motor/001': 1 } });
  assert.deepEqual(state.quantities, { 'motor/001': 1, 'kuzov/001': 1 });
});

test('search combines name, article and model words and normalizes Uzbek apostrophes', () => {
  const enriched = readProducts({ gazel: { x: { nomi: 'G‘ildirak podshipnik', narxi: 1000, qoldiq: 2, artikul: 'GAZ-3302', model: 'Gazel Next' } } });
  assert.equal(filterProducts(enriched, "G'ildirak 3302 Next", null).length, 1);
  assert.equal(filterProducts(enriched, '3302 boshqasi', null).length, 0);
});

test('optional product fields keep legacy records valid and reject insecure image URLs', () => {
  const [p] = readProducts({ gazel: { x: { nomi: 'Filtr', narxi: 1000, qoldiq: 2, rasm: 'http://invalid.example/a.png', eskiNarx: 1500, revision: 3 } } });
  assert.equal(p.rasm, undefined);
  assert.equal(p.eskiNarx, 1500);
  assert.equal(p.revision, 3);
});
