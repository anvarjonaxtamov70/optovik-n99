import assert from 'node:assert/strict';
import test from 'node:test';
import { moveOrder, normalizeCheckout, orderId, placeOrder, updateProduct } from '../functions/domain.mjs';

const now = 1800000000000;
const base = () => ({ tovarlar: { gazel: { filter: { nomi: 'Moy filtri', narxi: 100000, qoldiq: 3 } } }, customers: { alice: { balance: 50000 } }, settings: { commerce: { cashbackBps: 80, courierEnabled: true, shippingFee: 15000 } } });
const input = (extra = {}) => normalizeCheckout({ attemptId: 'attempt_123456789', items: [{ id: 'gazel/filter', quantity: 2 }], customer: { name: 'Anvar Ax', phone: '+998901234567', address: 'Samarqand, uy 19' }, delivery: 'pickup', note: '', expectedTotal: 200000, useCashback: false, ...extra });
const id = orderId('alice', input().attemptId);
const placed = () => placeOrder(base(), 'alice', input(), now);
const change = (root, status, expectedStatus, actor = { uid: 'owner', admin: true }) => moveOrder(root, actor, { uid: 'alice', id, status, expectedStatus }, now + 1000);

test('server uses catalog prices, reserves stock and stores an immutable line snapshot', () => {
  const original = base(); const result = placeOrder(original, 'alice', input(), now);
  assert.equal(original.tovarlar.gazel.filter.qoldiq, 3);
  assert.equal(result.tovarlar.gazel.filter.qoldiq, 1);
  assert.equal(result.orders.alice[id].total, 200000);
  assert.equal(result.orders.alice[id].items[0].price, 100000);
  assert.equal(result.orderIndex[id].uid, 'alice');
});
test('same request after lost response returns same order without reserving again', () => {
  const result = placed();
  assert.deepEqual(placeOrder(result, 'alice', input(), now + 60000), result);
  assert.throws(() => placeOrder(result, 'alice', input({ note: 'different' }), now), /boshqa buyurtma/);
});
test('two buyers competing for remaining stock cannot both buy it', () => {
  const root = placed();
  assert.throws(() => placeOrder(root, 'bob', input(), now), /1 dona/);
  assert.equal(root.tovarlar.gazel.filter.qoldiq, 1);
  assert.equal(Object.keys(root.orders).length, 1);
});
test('tampered totals and stock shortages abort the entire multi-line order', () => {
  const root = base(); root.tovarlar.gazel.empty = { nomi: 'Bo‘sh', narxi: 1, qoldiq: 0 };
  const before = structuredClone(root);
  assert.throws(() => placeOrder(root, 'alice', input({ expectedTotal: 1 }), now), /Narx/);
  assert.throws(() => placeOrder(root, 'alice', input({ items: [{ id: 'gazel/filter', quantity: 1 }, { id: 'gazel/empty', quantity: 1 }] }), now), /0 dona/);
  assert.deepEqual(root, before);
});
test('reject invalid paths, duplicate IDs, fractions, empty or excessive carts', () => {
  for (const items of [[], [{ id: 'a/b/c', quantity: 1 }], [{ id: 'a/b', quantity: 1.5 }], [{ id: 'a/b', quantity: 1 }, { id: 'a/b', quantity: 1 }], Array.from({ length: 51 }, (_, n) => ({ id: 'a/' + n, quantity: 1 }))]) {
    assert.throws(() => input({ items }));
  }
});
test('delivery fee and enabled state come from the server', () => {
  const root = base();
  assert.throws(() => placeOrder(root, 'alice', input({ delivery: 'courier' }), now), /Narx/);
  const result = placeOrder(root, 'alice', input({ delivery: 'courier', expectedTotal: 215000 }), now);
  assert.equal(result.orders.alice[id].shipping, 15000);
  root.settings.commerce.courierEnabled = false;
  assert.throws(() => placeOrder(root, 'alice', input({ delivery: 'courier', expectedTotal: 215000 }), now), /mavjud emas/);
});
test('customers only cancel their own pending orders; admin transitions are ordered', () => {
  const root = placed();
  assert.throws(() => change(root, 'accepted', 'pending', { uid: 'alice', admin: false }), /ruxsat/);
  assert.throws(() => change(root, 'cancelled', 'pending', { uid: 'bob', admin: false }), /ruxsat/);
  assert.throws(() => change(root, 'delivered', 'pending'), /holati/);
  const accepted = change(root, 'accepted', 'pending');
  assert.throws(() => change(accepted, 'cancelled', 'accepted', { uid: 'alice', admin: false }), /ruxsat/);
  assert.throws(() => change(accepted, 'shipped', 'pending'), /holati/);
});
test('cancellation restores stock and cashback once, even on retry', () => {
  const result = placeOrder(base(), 'alice', input({ useCashback: true, expectedTotal: 160000 }), now);
  assert.equal(result.customers.alice.balance, 10000);
  const cancelled = change(result, 'cancelled', 'pending', { uid: 'alice', admin: false });
  assert.equal(cancelled.tovarlar.gazel.filter.qoldiq, 3);
  assert.equal(cancelled.customers.alice.balance, 50000);
  assert.deepEqual(change(cancelled, 'cancelled', 'pending', { uid: 'alice', admin: false }), cancelled);
});
test('cashback is earned on delivery only and reversed exactly once on return', () => {
  let root = placed(); assert.equal(root.customers.alice.balance, 50000);
  root = change(change(change(root, 'accepted', 'pending'), 'shipped', 'accepted'), 'delivered', 'shipped');
  assert.equal(root.customers.alice.balance, 51600);
  assert.deepEqual(change(root, 'delivered', 'shipped'), root);
  root = change(root, 'returned', 'delivered');
  assert.equal(root.customers.alice.balance, 50000);
  assert.equal(root.tovarlar.gazel.filter.qoldiq, 3);
  assert.deepEqual(change(root, 'returned', 'delivered'), root);
});
test('cashback cannot exceed available balance or 20 percent of items subtotal', () => {
  const result = placeOrder(base(), 'alice', input({ useCashback: true, expectedTotal: 160000 }), now);
  assert.equal(result.orders.alice[id].cashbackUsed, 40000);
  const root = base(); root.customers.alice.balance = -100;
  const second = placeOrder(root, 'alice', input({ useCashback: true }), now);
  assert.equal(second.orders.alice[id].cashbackUsed, 0);
});
test('rate limit applies to new orders while existing attempts remain recoverable', () => {
  const root = base(); root.customers.alice.orderTimes = [now - 10, now - 20, now - 30];
  assert.throws(() => placeOrder(root, 'alice', input(), now), /ko‘payib/);
  const result = placed(); result.customers.alice.orderTimes = Array(20).fill(now);
  assert.deepEqual(placeOrder(result, 'alice', input(), now), result);
});
test('editing stale product stock is rejected instead of undoing a reservation', () => {
  const root = placed();
  const edit = { id: 'gazel/filter', expectedRevision: 0, nomi: 'Filtr', narxi: 100000, qoldiq: 3, eskiNarx: 0 };
  assert.throws(() => updateProduct(root, edit), /yangilangan/);
  const result = updateProduct(root, { ...edit, expectedRevision: 1, qoldiq: 1 });
  assert.equal(result.tovarlar.gazel.filter.qoldiq, 1);
  assert.equal(result.tovarlar.gazel.filter.revision, 2);
});
test('product creation rejects invalid price, stock and insecure media', () => {
  const edit = { id: 'gazel/new', expectedRevision: null, nomi: 'Yangi', narxi: 200, qoldiq: 5, eskiNarx: 0 };
  assert.equal(updateProduct(base(), edit).tovarlar.gazel.new.narxi, 200);
  for (const extra of [{ narxi: -1 }, { qoldiq: 1.5 }, { rasm: 'http://example.com/a.png' }, { eskiNarx: 100 }]) assert.throws(() => updateProduct(base(), { ...edit, ...extra }));
});
