// Separate staging-only entrypoint, disabled by default. Do not deploy over the active RTDB Worker.
import {identity,accessToken} from './staging-worker.mjs';
import {firestoreRunner} from './firestore-rest.mjs';
import {createFirestoreApi} from './firestore-api.mjs';
export default createFirestoreApi({
  enabled:env=>env?.FIREBASE_PROJECT_ID==='optovik-n99-staging'&&env?.N99_FIRESTORE_CANDIDATE==='enabled',
  authenticate:identity,
  runner:async(env,deadline)=>firestoreRunner({token:await accessToken(env,deadline,'firestore'),deadline}),
});
