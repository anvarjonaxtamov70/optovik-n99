// Separate staging-only entrypoint, disabled by default. Do not deploy over the active RTDB Worker.
import {identity,accessToken} from './staging-worker.mjs';
import {firestoreRunner} from './firestore-rest.mjs';
import {syntheticDatasetRunner} from './firestore-isolation.mjs';
import {createFirestoreApi} from './firestore-api.mjs';
// Operator selected Eskiz SMS. Telegram modules remain offline reference code;
// no Telegram route is dispatched even if obsolete environment flags are set.
export default createFirestoreApi({
  enabled:env=>env?.FIREBASE_PROJECT_ID==='optovik-n99-staging'&&env?.N99_FIRESTORE_CANDIDATE==='enabled'&&env?.N99_DATASET==='synthetic-only',
  authenticate:identity,
  runner:async(env,deadline,onTiming)=>syntheticDatasetRunner(firestoreRunner({token:await accessToken(env,deadline,'firestore'),deadline,onTiming})),
});
