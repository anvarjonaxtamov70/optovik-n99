import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import {
  Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, type ScrollViewInstance, type ScrollViewProps,
} from 'react-native';

import { keyboardStore } from '../../state/keyboard';
import { KEYBOARD_BUTTON_SPACE } from './KeyboardDismiss';

type FormScrollApi = { reveal: () => void };
const FormScrollContext = createContext<FormScrollApi | null>(null);

/** Yozilayotgan maydon atrofidagi bo'sh joy (xato/izoh matni ham ko'rinsin). */
const MARGIN = 20;

/** Maydon fokuslanganda (klaviatura allaqachon ochiq bo'lsa) uni ko'rinadigan joyga suradi. */
export function useFormReveal() {
  return useContext(FormScrollContext)?.reveal;
}

/**
 * Klaviaturani hisobga oladigan forma ro'yxati (Expo hujjatidagi tavsiya bo'yicha):
 * - `KeyboardAvoidingView` ikkala platformada `padding` bilan — Android ham (Expo ilovalari ekran chetigacha
 *   chiziladi, oyna klaviatura uchun o'zi qisqarmaydi; avval Android'da pastdagi maydonlar klaviatura ostida qolardi);
 * - yozilayotgan maydon klaviatura va «Yopish» tugmasi ustiga avtomatik suriladi.
 * `avoid={false}` — tashqarida o'z KeyboardAvoidingView'i bor joylar uchun (masalan, Sheet).
 */
export function FormScroll({ children, avoid = true, contentContainerStyle, onScroll, ...rest }: ScrollViewProps & { children: ReactNode; avoid?: boolean }) {
  const ref = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);

  const reveal = useCallback(() => {
    const kb = keyboardStore.get();
    const input = TextInput.State.currentlyFocusedInput();
    if (!kb.visible || !input || !ref.current) return;
    input.measureInWindow((_x, y, _w, h) => {
      const limit = kb.top - KEYBOARD_BUTTON_SPACE;
      const overflow = y + h + MARGIN - limit;
      if (overflow > 0) ref.current?.scrollTo({ y: offset.current + overflow, animated: true });
    });
  }, []);

  useEffect(() => {
    // Klaviatura chiqib bo'lgach (KeyboardAvoidingView ro'yxatni qisqartirgandan keyin) hisoblaymiz.
    const sub = Keyboard.addListener('keyboardDidShow', () => { setTimeout(reveal, Platform.OS === 'android' ? 120 : 40); });
    return () => sub.remove();
  }, [reveal]);

  const api = useMemo(() => ({ reveal: () => { if (keyboardStore.get().visible) setTimeout(reveal, 80); } }), [reveal]);
  const scroll = (
    <ScrollView
      ref={ref}
      keyboardShouldPersistTaps="handled"
      scrollEventThrottle={16}
      {...rest}
      contentContainerStyle={contentContainerStyle}
      onScroll={(e) => { offset.current = e.nativeEvent.contentOffset.y; onScroll?.(e); }}
    >
      {children}
    </ScrollView>
  );
  return (
    <FormScrollContext.Provider value={api}>
      {avoid ? <KeyboardAvoidingView behavior="padding" style={styles.flex}>{scroll}</KeyboardAvoidingView> : scroll}
    </FormScrollContext.Provider>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
