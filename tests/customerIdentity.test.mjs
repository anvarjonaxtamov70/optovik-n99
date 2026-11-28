import test from 'node:test';
import assert from 'node:assert/strict';
import { validAccountEmail, validAccountPassword, maySwitchGuest, ownedProfile, maySignOutCustomer, identityErrorKey, validEmailCorrection, neutralPasswordReset } from '../src/domain/customerIdentity.ts';
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

test('profile cache is visible only to its recorded UID',()=>{
 const profile={name:'Synthetic'};
 assert.deepEqual(ownedProfile({uid:'a',profile},'a'),profile);
 for(const raw of [profile,null,[],{uid:'b',profile},{uid:'a',profile:[]}])assert.equal(ownedProfile(raw,'a'),null);
});
test('signout requires a verified identity and definitely absent pending state',()=>{
 assert.equal(maySignOutCustomer(true,null),true);
 assert.equal(maySignOutCustomer(false,null),false);
 for(const pending of [undefined,{},false,{id:'pending'}])assert.equal(maySignOutCustomer(true,pending),false);
});

test('identity errors identify safe failure categories without exposing private details',()=>{
 assert.equal(identityErrorKey({code:'auth/email-already-in-use'},'link'),'identity.linkConflict');
 assert.equal(identityErrorKey({code:'auth/operation-not-allowed'},'link'),'identity.providerError');
 assert.equal(identityErrorKey({code:'auth/weak-password'},'link'),'identity.invalidPassword');
 assert.equal(identityErrorKey({code:'auth/invalid-credential'},'login'),'identity.loginError');
 assert.equal(identityErrorKey({code:'guest-history'},'login'),'identity.guestHistory');
 assert.equal(identityErrorKey({code:'auth/user-not-found'},'reset'),'common.error');
 assert.equal(identityErrorKey({code:'secret',message:'private'},'link'),'common.error');
});

test('password reset hides unknown accounts but preserves actionable errors',()=>{
 assert.equal(neutralPasswordReset({code:'auth/user-not-found'}),true);
 for(const code of ['auth/network-request-failed','auth/too-many-requests','auth/invalid-email'])assert.equal(neutralPasswordReset({code}),false);
 assert.equal(neutralPasswordReset(null),false);
 assert.equal(identityErrorKey({code:'auth/user-token-expired'},'refresh'),'identity.sessionExpired');
});

test('email correction validates a distinct destination and maps reauthentication failures',()=>{
 assert.equal(validEmailCorrection('old@example.test','new@example.test'),true);
 assert.equal(validEmailCorrection('OLD@example.test',' old@example.test '),false);
 assert.equal(validEmailCorrection(null,'new@example.test'),false);
 assert.equal(validEmailCorrection('old@example.test','invalid'),false);
 assert.equal(identityErrorKey({code:'auth/requires-recent-login'},'changeEmail'),'identity.changePasswordError');
 assert.equal(identityErrorKey({code:'auth/email-already-in-use'},'changeEmail'),'identity.linkConflict');
 assert.equal(maySignOutCustomer(false,null),false);
});
