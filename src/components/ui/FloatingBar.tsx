import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout, shadow } from '../../theme/tokens';
import { GlassFill, LIQUID_GLASS } from './Glass';

const R = 26;

/** Suzuvchi panel balandligi (ichki bo'shliq bilan) — kontentning pastki bo'shlig'ini hisoblash uchun. */
export const FLOATING_BAR_HEIGHT = 72;

/** Ekran pastidan masofa: uy tugmasi chizig'i (iPhone) yoki Android tugmalari ustida. */
export function useFloatingBarBottom() {
  const insets = useSafeAreaInsets();
  return Math.max(insets.bottom - 4, 12);
}

/** Suzuvchi panel ostida kontent ko'rinib qolishi uchun ro'yxatning pastki bo'shlig'i. */
export function useFloatingBarSpace(extra = 16) {
  return useFloatingBarBottom() + FLOATING_BAR_HEIGHT + extra;
}

/**
 * Pastda suzib turadigan «shisha» panel (narx + asosiy tugma). iOS 26 da orqasidan ro'yxat
 * shisha orqali ko'rinadi; boshqa telefonlarda — oq, yengil soyali kapsula.
 * `bottom` berilsa — o'sha balandlikda (masalan, pastki menyu ustida).
 */
export function FloatingBar({ children, bottom, style }: { children: ReactNode; bottom?: number; style?: StyleProp<ViewStyle> }) {
  const auto = useFloatingBarBottom();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: bottom ?? auto }]}>
      <View style={[styles.bar, !LIQUID_GLASS && styles.face, !LIQUID_GLASS && shadow.glass, style]}>
        <GlassFill tone="light" radius={R} real />
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  bar: {
    width: '100%', maxWidth: layout.maxWidth - 24, minHeight: FLOATING_BAR_HEIGHT, borderRadius: R,
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 18, paddingRight: 8, paddingVertical: 8,
  },
  // Taqlidda soya tez chizilishi uchun shaffof bo'lmagan yuz.
  face: { backgroundColor: colors.white },
});
