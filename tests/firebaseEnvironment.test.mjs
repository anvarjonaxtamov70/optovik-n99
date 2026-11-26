import assert from 'node:assert/strict';
import test from 'node:test';
import { selectFirebaseConfig } from '../src/domain/firebaseEnvironment.ts';

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
