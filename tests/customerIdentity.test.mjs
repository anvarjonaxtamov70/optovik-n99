import test from 'node:test';
import assert from 'node:assert/strict';
import { validAccountEmail, validAccountPassword, maySwitchGuest } from '../src/domain/customerIdentity.ts';
test('identity form validates bounded email and password without trimming passwords',()=>{
 assert.equal(validAccountEmail(' test@example.test '),true);
 for(const value of ['test','a@b','a b@example.test','x'.repeat(255)+'@a.test'])assert.equal(validAccountEmail(value),false);
 assert.equal(validAccountPassword('12345678'),true);
 assert.equal(validAccountPassword('1234567'),false);
 assert.equal(validAccountPassword('x'.repeat(129)),false);
});
test('guest with order history or unresolved pending state cannot switch',()=>{
 assert.equal(maySwitchGuest(null,null),true);
 assert.equal(maySwitchGuest(null,{}),true);
 for(const pending of [{id:'pending'},undefined,false])assert.equal(maySwitchGuest(pending,null),false);
 for(const orders of [{order:{}},[],false,undefined,'invalid'])assert.equal(maySwitchGuest(null,orders),false);
});
