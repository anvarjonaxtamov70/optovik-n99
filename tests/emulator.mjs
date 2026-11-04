// Runs only against local demo-project emulators. Never touches production.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../functions/package.json', import.meta.url));
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
if (!process.env.FIREBASE_DATABASE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) throw new Error('Emulators are required');
const projectId = 'demo-optovik';
initializeApp({ projectId, databaseURL: 'https://demo-optovik-default-rtdb.firebaseio.com' });
const db = getDatabase();
const auth = getAuth();
const dbURL = 'http://' + process.env.FIREBASE_DATABASE_EMULATOR_HOST;
const authURL = 'http://' + process.env.FIREBASE_AUTH_EMULATOR_HOST;
async function token(uid, admin = false, verified = true) {
  const email = uid + '@test.example';
  await auth.createUser({ uid, email, emailVerified: verified, password: 'test-password-123' });
  if (admin) await auth.setCustomUserClaims(uid, { admin: true });
  const result = await fetch(authURL + '/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo-key', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'test-password-123', returnSecureToken: true }),
  }).then((r) => r.json());
  assert.ok(result.idToken, 'sign in succeeded'); return result.idToken;
}
async function rest(path, jwt, method = 'GET', data) {
  return fetch(dbURL + '/' + path + '.json?ns=demo-optovik-default-rtdb' + (jwt ? '&auth=' + encodeURIComponent(jwt) : ''), { method,
    headers: { 'Content-Type': 'application/json' }, body: data === undefined ? undefined : JSON.stringify(data) });
}
async function call(name, jwt, data) {
  const response = await fetch('http://127.0.0.1:5001/' + projectId + '/europe-west1/' + name, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: 'Bearer ' + jwt } : {}) }, body: JSON.stringify({ data }) });
  return { ok: response.ok, body: await response.json() };
}
await db.ref().set({ tovarlar: { gazel: { filter: { nomi: 'Filtr', narxi: 100000, qoldiq: 1 } } } });
const [alice, bob, owner, unverified] = await Promise.all([token('alice'), token('bob'), token('owner', true), token('unverified', false, false)]);
assert.equal((await rest('tovarlar')).status, 200);
assert.equal((await rest('orders')).status, 401);
assert.equal((await rest('customers/alice/profile', alice, 'PUT', { name: 'Alice', phone: '', address: '', car: '' })).status, 200);
for (const [path, method, data] of [
  ['customers/bob/profile', 'PUT', { name: 'Alice', phone: '', address: '', car: '' }],
  ['customers/alice/balance', 'PUT', 999999], ['orders/alice/forged', 'PUT', { total: 1 }],
  ['tovarlar/gazel/filter/qoldiq', 'PUT', 100], ['orderIndex', 'GET', undefined],
]) assert.equal((await rest(path, alice, method, data)).status, 401, path + ' denied');
console.log('PASS rules: public catalog, own profile, protected orders/stock/balances/admin index');
const input = { attemptId: 'attempt_123456789', items: [{ id: 'gazel/filter', quantity: 1 }], customer: { name: 'Test User', phone: '+998901234567', address: '' }, delivery: 'pickup', note: '', expectedTotal: 100000, useCashback: false };
assert.equal((await call('createOrder', '', input)).ok, false);
assert.equal((await call('createOrder', unverified, input)).ok, false);
const result = await Promise.all([call('createOrder', alice, input), call('createOrder', bob, input)]);
assert.equal(result.filter((r) => r.ok).length, 1, JSON.stringify(result.map((r) => r.body.error ?? r.body.result)));
const winner = result[0].ok ? { uid: 'alice', jwt: alice, other: bob, result: result[0] } : { uid: 'bob', jwt: bob, other: alice, result: result[1] };
const order = winner.result.body.result ?? winner.result.body.data;
assert.ok(order.id);
assert.equal((await db.ref('tovarlar/gazel/filter/qoldiq').get()).val(), 0);
assert.equal((await call('createOrder', winner.jwt, input)).ok, true);
assert.equal((await db.ref('tovarlar/gazel/filter/qoldiq').get()).val(), 0);
assert.equal((await rest('orders/' + winner.uid, winner.other)).status, 401);
assert.equal((await rest('orders/' + winner.uid, winner.jwt)).status, 200);
assert.equal((await rest('orderIndex', owner)).status, 200);
assert.equal((await call('saveProduct', winner.jwt, {})).ok, false);
const status = { uid: winner.uid, id: order.id, status: 'cancelled', expectedStatus: 'pending' };
assert.equal((await call('changeOrderStatus', winner.other, status)).ok, false);
assert.equal((await call('changeOrderStatus', winner.jwt, status)).ok, true);
assert.equal((await call('changeOrderStatus', winner.jwt, status)).ok, true);
assert.equal((await db.ref('tovarlar/gazel/filter/qoldiq').get()).val(), 1);
console.log('PASS callable API: auth, real concurrent stock reservation, replay, privacy and exactly-once cancellation');
process.exit(0);
