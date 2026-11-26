import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { Platform } from 'react-native';
import { selectRuntimeConfig, type PublicFirebaseConfig } from '../domain/firebaseEnvironment';

// Firebase web konfiguratsiyasi maxfiy emas: himoya database.rules.json qoidalarida.
const productionConfig = {
  apiKey: 'AIzaSyDHt-KJLFQDd1wOAr-dYm67VZksaSTdmSU',
  authDomain: 'optovikn99.firebaseapp.com',
  databaseURL: 'https://optovikn99-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'optovikn99',
  storageBucket: 'optovikn99.firebasestorage.app',
  messagingSenderId: '220211635407',
  appId: '1:220211635407:web:8af6df7846ef7b66f883ba',
};

const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
const mode = process.env.EXPO_PUBLIC_N99_ENV;
const firebaseConfig: PublicFirebaseConfig = selectRuntimeConfig(productionConfig, mode, process.env.EXPO_PUBLIC_N99_STAGING_CONFIG, emulatorHost);
const appName = emulatorHost ? 'n99-emulator' : mode === 'staging' ? 'n99-staging-' + firebaseConfig.projectId : '[DEFAULT]';
export const app = getApps().find((candidate) => candidate.name === appName) ?? initializeApp(firebaseConfig, appName);
export const db = getDatabase(app);

export const auth: Auth = (() => {
  if (Platform.OS === 'web') return getAuth(app);
  try {
    return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  } catch (error) {
    if ((error as { code?: string }).code === 'auth/already-initialized') return getAuth(app);
    throw error;
  }
})();

// Faqat lokal sinov uchun: EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1 — production bazaga tegmaydi.
if (emulatorHost) {
  connectDatabaseEmulator(db, emulatorHost, 9000);
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
}

export type FirebaseProblem = 'auth-disabled' | 'permission' | 'network' | 'rate' | 'bad-login' | 'unknown';

export function classifyError(error: unknown): FirebaseProblem {
  const code = String((error as { code?: string })?.code ?? '');
  const message = String((error as { message?: string })?.message ?? '');
  if (/operation-not-allowed|configuration-not-found|admin-restricted|CONFIGURATION_NOT_FOUND/.test(code + message)) return 'auth-disabled';
  if (/invalid-credential|wrong-password|user-not-found|invalid-email|invalid-login/.test(code)) return 'bad-login';
  if (/too-many-requests/.test(code)) return 'rate';
  if (/network|unavailable|timeout|deadline/i.test(code + message)) return 'network';
  if (/permission|PERMISSION_DENIED/i.test(code + message)) return 'permission';
  return 'unknown';
}

/** Firebase yozuvi javob bermasa, foydalanuvchini abadiy kutdirmaslik uchun. */
export function withTimeout<T>(promise: Promise<T>, ms = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'timeout' })), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

/** Acknowledged server reads for reconciliation; the RTDB SDK may return cached data. */
async function serverJson(path: string, uid: string, writes?: Record<string, unknown>): Promise<unknown> {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) throw Object.assign(new Error('Account changed'), { code: 'permission-denied' });
  const token = await withTimeout(user.getIdToken(), 8000);
  if (auth.currentUser?.uid !== uid) throw Object.assign(new Error('Account changed'), { code: 'permission-denied' });
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const namespace = new URL(firebaseConfig.databaseURL).hostname.split('.')[0];
  const base = emulatorHost ? `http://${emulatorHost}:9000` : firebaseConfig.databaseURL;
  const url = `${base}/${encoded}.json?auth=${encodeURIComponent(token)}${emulatorHost ? '&ns=' + encodeURIComponent(namespace) : ''}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), writes ? 20000 : 10000);
  try {
    const response = await fetch(url, { signal: controller.signal, method: writes ? 'PATCH' : 'GET', headers: { 'Cache-Control': 'no-cache, no-store', ...(writes ? { 'Content-Type': 'application/json' } : {}) }, ...(writes ? { body: JSON.stringify(writes) } : {}) });
    if (!response.ok) throw Object.assign(new Error('Server read failed'), { code: response.status === 401 || response.status === 403 ? 'permission-denied' : 'network' });
    const value: unknown = await response.json();
    if (auth.currentUser?.uid !== uid) throw Object.assign(new Error('Account changed'), { code: 'permission-denied' });
    return value;
  } catch (error) {
    // Do not propagate fetch errors containing an authenticated URL.
    throw Object.assign(new Error('Server read failed'), { code: classifyError(error) === 'permission' ? 'permission-denied' : 'network' });
  } finally {
    clearTimeout(timer);
  }
}

export function readServerJson(path: string, uid: string): Promise<unknown> {
  return serverJson(path, uid);
}

/** REST writes never enter the SDK's offline write queue. A timeout still has an unknown outcome. */
export async function writeServerJson(writes: Record<string, unknown>, uid: string): Promise<void> {
  await serverJson('', uid, writes);
}
