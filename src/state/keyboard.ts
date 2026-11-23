import { Keyboard, Platform, type KeyboardEvent } from 'react-native';

import { createStore, useStore } from '../lib/store';

/**
 * Ekrandagi klaviatura holati. `top` — klaviaturaning yuqori cheti (ekran koordinatasida),
 * `duration` — iOS da klaviatura chiqish animatsiyasi (Android da 0: hodisa klaviatura chiqib bo'lgach keladi).
 */
export type KeyboardState = { visible: boolean; top: number; height: number; duration: number };

export const keyboardStore = createStore<KeyboardState>({ visible: false, top: 0, height: 0, duration: 0 });

let started = false;

/**
 * Klaviatura hodisalariga bir marta obuna bo'ladi (ilova ishga tushganda).
 * iOS: "chiqmoqda/yopilmoqda" hodisalari — tugma klaviatura bilan birga harakatlanadi.
 * Android: faqat "chiqdi/yopildi" (Android boshqa hodisa bermaydi).
 */
export function startKeyboard() {
  if (started || Platform.OS === 'web') return;
  started = true;
  const ios = Platform.OS === 'ios';
  const show = (e: KeyboardEvent) => {
    const { screenY, height } = e.endCoordinates;
    if (height <= 0) return;
    keyboardStore.set({ visible: true, top: screenY, height, duration: ios ? e.duration || 250 : 0 });
  };
  const hide = (e?: KeyboardEvent) => {
    keyboardStore.set((s) => (s.visible ? { ...s, visible: false, height: 0, duration: ios ? e?.duration || 250 : 0 } : s));
  };
  Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', show);
  // iOS: klaviatura balandligi o'zgarsa (emoji paneli, tavsiyalar qatori) — yangi chegara.
  if (ios) Keyboard.addListener('keyboardWillChangeFrame', (e) => { if (keyboardStore.get().visible) show(e); });
  Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', hide);
}

export const useKeyboard = () => useStore(keyboardStore, (s) => s);
export const useKeyboardVisible = () => useStore(keyboardStore, (s) => s.visible);
