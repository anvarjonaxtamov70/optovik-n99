import { initializeApp } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { DomainError, moveOrder, normalizeCheckout, orderId, placeOrder, updateProduct } from './domain.mjs';

initializeApp({ databaseURL: process.env.FUNCTIONS_EMULATOR === 'true' ? 'https://demo-optovik-default-rtdb.firebaseio.com' : 'https://optovikn99-default-rtdb.europe-west1.firebasedatabase.app' });
const db = getDatabase();
const options = { region: 'europe-west1', maxInstances: 5, timeoutSeconds: 30, memory: '256MiB' };
function actor(request, adminOnly = false) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Avval hisobga kiring.');
  if (!request.auth.token.email_verified) throw new HttpsError('permission-denied', 'Emailingizni tasdiqlang.');
  const value = { uid: request.auth.uid, admin: request.auth.token.admin === true };
  if (adminOnly && !value.admin) throw new HttpsError('permission-denied', 'Admin ruxsati kerak.');
  return value;
}
async function transact(update) {
  let failure;
  try {
    // The Admin RTDB callback runs on its event queue. Never throw from it:
    // returning the unchanged root validates its hash and allows a retry when
    // the local cache was stale. Only reject after the transaction completes.
    const result = await db.ref().transaction((root) => {
      failure = undefined;
      if (root === null) return null;
      try { return update(root); }
      catch (e) { failure = e; return root; }
    }, undefined, false);
    if (failure) throw failure;
    if (!result.committed || !result.snapshot.exists()) throw new HttpsError('unavailable', 'Baza hali tayyor emas.');
    return result.snapshot;
  } catch (e) {
    if (e instanceof DomainError) throw new HttpsError(e.code, e.message);
    if (e instanceof HttpsError) throw e;
    throw new HttpsError('unavailable', 'Buyurtma javobi kelmadi. Shu urinishni qayta tekshiring.');
  }
}
export const createOrder = onCall(options, async (request) => {
  const user = actor(request);
  let input;
  try { input = normalizeCheckout(request.data); } catch (e) {
    if (e instanceof DomainError) throw new HttpsError(e.code, e.message);
    throw new HttpsError('invalid-argument', 'Buyurtma ma’lumotlari noto‘g‘ri.');
  }
  const now = Date.now();
  await transact((root) => placeOrder(root, user.uid, input, now));
  return { id: orderId(user.uid, input.attemptId), uid: user.uid };
});
export const changeOrderStatus = onCall(options, async (request) => {
  const user = actor(request);
  const now = Date.now();
  await transact((root) => moveOrder(root, user, request.data, now));
  return { ok: true };
});
export const saveProduct = onCall(options, async (request) => {
  actor(request, true);
  await transact((root) => updateProduct(root, request.data));
  return { ok: true };
});
