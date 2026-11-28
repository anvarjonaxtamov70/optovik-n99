// Separate staging-only entrypoint, disabled by default. Do not deploy over the active RTDB Worker.
import {identity,identityDetails,accessToken} from './staging-worker.mjs';
import {firestoreRunner} from './firestore-rest.mjs';
import {syntheticDatasetRunner} from './firestore-isolation.mjs';
import {createFirestoreApi} from './firestore-api.mjs';
import {createTelegramWebhook} from './telegram-webhook.mjs';
import {createTelegramIdentityCore} from './telegram-identity.mjs';
import {createTelegramExchange,isTelegramExchange,lookupTelegramTarget} from './telegram-exchange.mjs';
import {signTelegramCustomToken} from './firebase-custom-token.mjs';
import {paths} from './firestore-orders.mjs';
const api=createFirestoreApi({
  enabled:env=>env?.FIREBASE_PROJECT_ID==='optovik-n99-staging'&&env?.N99_FIRESTORE_CANDIDATE==='enabled'&&env?.N99_DATASET==='synthetic-only',
  authenticate:identity,
  runner:async(env,deadline,onTiming)=>syntheticDatasetRunner(firestoreRunner({token:await accessToken(env,deadline,'firestore'),deadline,onTiming})),
});

const runFor=async(env,deadline)=>syntheticDatasetRunner(firestoreRunner({token:await accessToken(env,deadline,'firestore'),deadline}));
const coreFor=async(env,deadline)=>createTelegramIdentityCore({secret:env.TELEGRAM_IDENTITY_SECRET,run:await runFor(env,deadline)});
const webhook=createTelegramWebhook({coreFor});
const exchange=createTelegramExchange({authenticate:identityDetails,coreFor,sign:signTelegramCustomToken,checkTarget:async(env,uid,deadline)=>{
 const run=await runFor(env,deadline);
 const role=await run(async tx=>tx.get(paths.admin(uid)),[],{readOnly:true});
 if(role===true)return false;
 return lookupTelegramTarget({uid,access:await accessToken(env,deadline,'auth-read'),deadline});
}});
export default {fetch(request,env){
 const path=new URL(request.url).pathname;
 return path==='/telegram/webhook'?webhook(request,env):isTelegramExchange(path)?exchange(request,env):api.fetch(request,env);
}};
