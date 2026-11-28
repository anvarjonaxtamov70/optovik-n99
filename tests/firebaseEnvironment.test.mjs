import assert from 'node:assert/strict';
import test from 'node:test';
import { selectFirebaseConfig, selectRuntimeConfig } from '../src/domain/firebaseEnvironment.ts';

const config = (id) => ({ projectId: id, apiKey: 'key-' + id, appId: 'app-' + id, authDomain: id + '.firebaseapp.com', databaseURL: 'https://' + id + '-default-rtdb.europe-west1.firebasedatabase.app' });
const prod = config('n99-production');
const stage = config('n99-staging');
test('production defaults to existing config', () => assert.equal(selectFirebaseConfig(prod, undefined, undefined), prod));
test('staging accepts separate Firebase project', () => assert.deepEqual(selectFirebaseConfig(prod, 'staging', JSON.stringify(stage)), stage));
test('staging fails closed for absent, malformed or production settings', () => {
  for (const value of [undefined, '', '{', 'null', JSON.stringify(prod), JSON.stringify({ ...stage, databaseURL: prod.databaseURL }), JSON.stringify({ ...stage, apiKey: prod.apiKey })]) {
    assert.throws(() => selectFirebaseConfig(prod, 'staging', value));
  }
  assert.throws(() => selectFirebaseConfig(prod, 'preview', JSON.stringify(stage)));
});

test('emulator uses synthetic project identity and rejects nonlocal hosts', () => {
  const local = selectRuntimeConfig(prod, undefined, undefined, '127.0.0.1');
  assert.equal(local.projectId, 'demo-n99');
  assert.notEqual(local.apiKey, prod.apiKey);
  assert.notEqual(local.databaseURL, prod.databaseURL);
  assert.throws(() => selectRuntimeConfig(prod, 'staging', JSON.stringify(stage), '127.0.0.1'));
  assert.throws(() => selectRuntimeConfig(prod, undefined, undefined, 'example.com'));
});
