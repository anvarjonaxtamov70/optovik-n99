// Separate staging-only entrypoint, disabled by default. Do not deploy over the active RTDB Worker.
import {identity,accessToken} from './staging-worker.mjs';
import {firestoreRunner} from './firestore-rest.mjs';
import {syntheticDatasetRunner} from './firestore-isolation.mjs';
import {createFirestoreApi} from './firestore-api.mjs';
import {createTelegramWebhook} from './telegram-webhook.mjs';
import {createTelegramIdentityCore} from './telegram-identity.mjs';
const api=createFirestoreApi({
  enabled:env=>env?.FIREBASE_PROJECT_ID==='optovik-n99-staging'&&env?.N99_FIRESTORE_CANDIDATE==='enabled'&&env?.N99_DATASET==='synthetic-only',
  authenticate:identity,
  runner:async(env,deadline,onTiming)=>syntheticDatasetRunner(firestoreRunner({token:await accessToken(env,deadline,'firestore'),deadline,onTiming})),
});

const webhook=createTelegramWebhook({coreFor:async(env,deadline)=>createTelegramIdentityCore({secret:env.TELEGRAM_IDENTITY_SECRET,run:syntheticDatasetRunner(firestoreRunner({token:await accessToken(env,deadline,'firestore'),deadline}))})});
export default {fetch(request,env){return new URL(request.url).pathname==='/telegram/webhook'?webhook(request,env):api.fetch(request,env);}};
