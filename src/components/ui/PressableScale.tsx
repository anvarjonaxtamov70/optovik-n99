import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { Pressable, StyleSheet, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import { press } from '../../theme/motion';
import { colors } from '../../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type PressState = { pressed: SharedValue<number>; hovered: SharedValue<number> };
const PressContext = createContext<PressState | null>(null);

/** Bosilish holati (0 — tinch, 1 — bosilgan; qaytishda bir lahza 0 dan pastga tushadi). */
export function usePressState() {
  return useContext(PressContext);
}

/**
 * Bosilganda kichrayish va pastga ozgina botish. Faqat `transform` — telefon uni videokartada chizadi,
 * soya va rasm qayta chizilmaydi, shuning uchun arzon telefonlarda ham silliq.
 */
export function usePressStyle(pressed: SharedValue<number>, scaleTo: number, depth = 0) {
  return useAnimatedStyle(() => {
    const p = pressed.value;
    return { transform: [{ translateY: depth * Math.max(0, p) }, { scale: 1 - (1 - scaleTo) * p }] };
  });
}

export type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
  /** Bosilgandagi o'lcham: 0.97 — 3% kichrayadi. */
  scaleTo?: number;
  /** Bosilganda necha piksel pastga botadi (tugmalarda 1–1.5). */
  depth?: number;
  /** Tashqi bosilish qiymati: siqilish boshqa elementga (masalan, butun kartaga) beriladi, o'zi siqilmaydi. */
  progress?: SharedValue<number>;
  feedback?: 'tap' | 'light' | 'medium' | false;
  /**
   * O'chirilgan holatda yarim shaffof qilish. Shisha tugmalar o'zini o'zi kulrang qiladi: iOS 26 shishasi
   * ota-qatlam shaffof bo'lsa chizilmaydi (Apple tavsiyasi), shuning uchun ularda `false`.
   */
  dimWhenDisabled?: boolean;
};

/**
 * Ilovadagi barcha bosiladigan joylar asosi: tegilganda tez botadi, qo'yib yuborilganda prujinadek qaytadi
 * (ozgina "tirik" sakrash bilan). Kompyuterda sichqoncha ustida turganda ham sezdiradi.
 */
export function PressableScale({
  scaleTo = 0.97, depth = 0, progress, style, onPressIn, onPressOut, onPress, onHoverIn, onHoverOut,
  feedback = false, disabled, children, unstable_pressDelay = press.delay, dimWhenDisabled = true, ...rest
}: PressableScaleProps) {
  const own = useSharedValue(0);
  const hovered = useSharedValue(0);
  const pressed = progress ?? own;
  const state = useMemo(() => ({ pressed, hovered }), [pressed, hovered]);
  const animated = usePressStyle(pressed, progress ? 1 : scaleTo, progress ? 0 : depth);
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      unstable_pressDelay={unstable_pressDelay}
      {...rest}
      onPressIn={(e) => { pressed.set(withTiming(1, press.in)); onPressIn?.(e); }}
      onPressOut={(e) => { pressed.set(withSpring(0, press.out)); onPressOut?.(e); }}
      onHoverIn={(e) => { hovered.set(withTiming(1, press.hover)); onHoverIn?.(e); }}
      onHoverOut={(e) => { hovered.set(withTiming(0, press.hover)); onHoverOut?.(e); }}
      onPress={(e) => { if (feedback) haptic[feedback](); onPress?.(e); }}
      style={[style, animated, disabled && dimWhenDisabled ? styles.disabled : null]}
    >
      <PressContext.Provider value={state}>{children}</PressContext.Provider>
    </AnimatedPressable>
  );
}

/**
 * Bosilganda sekin qorayadigan (yoki ko'k tus beradigan) qatlam — tugma "botgandek" ko'rinadi.
 * Matn va ikonkadan OLDIN qo'yiladi, ular aniq qoladi. Faqat `opacity` o'zgaradi — arzon.
 */
export function PressOverlay({ color = colors.ink, max = 0.08, radius = 0, inset }: {
  color?: string; max?: number; radius?: number; inset?: { top?: number; bottom?: number; left?: number; right?: number };
}) {
  const state = usePressState();
  const style = useAnimatedStyle(() => {
    if (!state) return { opacity: 0 };
    return { opacity: Math.min(1, Math.max(0, state.pressed.value) + state.hovered.value * 0.5) * max };
  });
  return <Animated.View style={[styles.overlay, { backgroundColor: color, borderRadius: radius }, inset, style]} />;
}

const styles = StyleSheet.create({
  disabled: { opacity: 0.55 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
});
