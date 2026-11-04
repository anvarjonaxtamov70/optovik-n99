import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { Platform } from 'react-native';

import '../../firebaseConfig';

const app = getApp();
export const auth = (() => {
  if (Platform.OS === 'web') return getAuth(app);
  try { return initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) }); }
  catch (error) {
    if ((error as { code?: string }).code === 'auth/already-initialized') return getAuth(app);
    throw error;
  }
})();
export const functions = getFunctions(app, 'europe-west1');
export const commerceEnabled = process.env.EXPO_PUBLIC_COMMERCE_ENABLED === 'true';

export function errorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code ?? '';
  if (code.includes('invalid-credential') || code.includes('wrong-password')) return 'Email yoki parol noto‘g‘ri.';
  if (code.includes('email-already-in-use')) return 'Bu email bilan hisob bor. Kirish tugmasini tanlang.';
  if (code.includes('invalid-email')) return 'Emailni tekshiring.';
  if (code.includes('weak-password')) return 'Parol kamida 8 belgidan iborat bo‘lsin.';
  if (code.includes('operation-not-allowed') || code.includes('configuration-not-found')) return 'Hisobga kirish xizmati hali ishga tushirilmagan.';
  if (code.includes('too-many-requests') || code.includes('resource-exhausted')) return 'Urinishlar ko‘payib ketdi. Birozdan keyin qayta urinib ko‘ring.';
  if (code.includes('network') || code.includes('unavailable') || code.includes('deadline')) return 'Aloqa uzildi. Internetni tekshirib, qayta urinib ko‘ring.';
  if (['functions/failed-precondition', 'functions/invalid-argument', 'functions/permission-denied', 'functions/not-found'].includes(code)) return (error as Error).message;
  return 'Amal bajarilmadi. Qayta urinib ko‘ring.';
}
