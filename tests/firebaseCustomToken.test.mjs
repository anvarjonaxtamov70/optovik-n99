import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
import {signTelegramCustomToken} from '../backend/firebase-custom-token.mjs';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const email='synthetic@optovik-n99-staging.iam.gserviceaccount.com';
const env={FIREBASE_PROJECT_ID:'optovik-n99-staging',N99_DATASET:'synthetic-only',N99_FIRESTORE_CANDIDATE:'enabled',N99_TELEGRAM_AUTH:'enabled',FIREBASE_SERVICE_ACCOUNT:JSON.stringify({project_id:'optovik-n99-staging',client_email:email,private_key:privateKey.export({type:'pkcs8',format:'pem'})})};
test('custom token is signed for fixed audience, committed UID and short lifetime',async()=>{
 const token=await signTelegramCustomToken(env,{status:'authorized',uid:'synthetic-uid'},()=>1800000000000);
 const [h,p,s]=token.split('.');
 assert.equal(verify('RSA-SHA256',Buffer.from(h+'.'+p),publicKey,Buffer.from(s,'base64url')),true);
 const claims=JSON.parse(Buffer.from(p,'base64url'));
 assert.equal(claims.uid,'synthetic-uid');assert.equal(claims.iss,email);assert.equal(claims.sub,email);
 assert.equal(claims.aud,'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit');
 assert.equal(claims.exp-claims.iat,120);assert.deepEqual(claims.claims,{n99_telegram:true});
});
test('custom token refuses disabled environment, uncommitted authorization or bad key',async()=>{
 for(const patch of [{N99_TELEGRAM_AUTH:'disabled'},{FIREBASE_PROJECT_ID:'production'},{FIREBASE_SERVICE_ACCOUNT:'invalid'}])await assert.rejects(signTelegramCustomToken({...env,...patch},{status:'bound',uid:'test'}),/custom-token-unavailable/);
 await assert.rejects(signTelegramCustomToken(env,{status:'conflict',uid:'test'}),/custom-token-unavailable/);
});
