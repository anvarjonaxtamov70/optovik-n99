import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { composeAddress, isValidLatLng, type LatLng } from '../domain/geo';

function timeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    p.then((v) => { clearTimeout(id); resolve(v); }, (e) => { clearTimeout(id); reject(e); });
  });
}

/** Joylashuvga ruxsat allaqachon berilganmi (so'ramasdan tekshiradi). */
export async function hasLocationPermission(): Promise<boolean> {
  try {
    return (await Location.getForegroundPermissionsAsync()).granted;
  } catch {
    return false;
  }
}

/**
 * Ruxsat so'raydi. `blocked` — foydalanuvchi avval «hech qachon» degan: faqat telefon sozlamalaridan yoqiladi.
 * Faqat foydalanuvchi «Mening joylashuvim» tugmasini bosganda chaqiriladi (ekran ochilganda so'ralmaydi).
 */
export async function askLocation(): Promise<'granted' | 'denied' | 'blocked'> {
  try {
    const r = await Location.requestForegroundPermissionsAsync();
    if (r.granted) return 'granted';
    return r.canAskAgain ? 'denied' : 'blocked';
  } catch {
    return 'denied';
  }
}

/** Hozirgi joy: avval telefon eslab qolgan oxirgi joy (tez), bo'lmasa yangi o'lchov (12 soniyagacha). */
export async function currentPoint(): Promise<LatLng | null> {
  try {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 2 * 60_000, requiredAccuracy: 150 });
    if (last) {
      const p = { lat: last.coords.latitude, lng: last.coords.longitude };
      if (isValidLatLng(p)) return p;
    }
    const pos = await timeout(Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), 12_000);
    const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    return isValidLatLng(p) ? p : null;
  } catch {
    return null;
  }
}

/**
 * Nuqtadan qisqa manzil matni (telefonning o'z geokoderi: iPhone — Apple, Android — Google; bepul, kalitsiz).
 * Android'da joylashuv ruxsatisiz ishlamaydi — u holda bo'sh qaytadi va foydalanuvchi o'zi yozadi.
 */
export async function addressAt(p: LatLng, permitted: boolean): Promise<string> {
  if (Platform.OS === 'web' || (Platform.OS === 'android' && !permitted)) return '';
  try {
    const [a] = await timeout(Location.reverseGeocodeAsync({ latitude: p.lat, longitude: p.lng }), 8_000);
    return a ? composeAddress(a) : '';
  } catch {
    return '';
  }
}
