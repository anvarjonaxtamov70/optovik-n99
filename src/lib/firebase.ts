import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
import { Platform } from 'react-native';

// Firebase web konfiguratsiyasi maxfiy emas: himoya database.rules.json qoidalarida.
const firebaseConfig = {
  apiKey: 'AIzaSyDHt-KJLFQDd1wOAr-dYm67VZksaSTdmSU',
  authDomain: 'optovikn99.firebaseapp.com',
  databaseURL: 'https://optovikn99-default-rtdb.europe-west1.firebasedatabase.app',
  projectId: 'optovikn99',
  storageBucket: 'optovikn99.firebasestorage.app',
  messagingSenderId: '220211635407',
  appId: '1:220211635407:web:8af6df7846ef7b66f883ba',
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
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
const emulatorHost = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
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
