import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectBackup } from '../scripts/check-backup.mjs';
test('backup verifier reports aggregate counts only', () => {
 assert.deepEqual(inspectBackup({tovarlar:{a:{b:{nomi:'Synthetic',narxi:100,qoldiq:2}}},orders:{u:{o:{status:'new'}}}}),{products:1,orders:1});
});
test('backup verifier rejects missing catalog and invalid inventory', () => {
 for (const value of [null,{}, {tovarlar:[]},{tovarlar:{a:{b:{nomi:'Synthetic',narxi:100,qoldiq:-1}}}},{tovarlar:{},orders:[]}]) assert.throws(()=>inspectBackup(value));
});
