import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { fill, glass, type GlassTone } from '../../theme/tokens';

function detectLiquidGlass(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    // Ba'zi iOS 26 beta versiyalarida API yo'q — tekshirmasdan ishlatilsa ilova yiqiladi (expo/expo#40911).
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

/** iOS 26 va undan yangi: tizimning haqiqiy «Liquid Glass» effekti mavjud. */
export const LIQUID_GLASS = detectLiquidGlass();

/**
 * Tugma yoki panelning «shisha» qatlami. Tugma ichida birinchi bola sifatida qo'yiladi (orqa fon).
 * - `real` — iOS 26 da haqiqiy shisha (orqadagi rasm/ro'yxat shisha orqali ko'rinadi). Faqat kontent ustida
 *   suzib turadigan joylarda (pastki menyu, rasm ustidagi tugmalar): ro'yxat ichida yuzlab shisha og'ir.
 * - Qolgan hamma joyda va Android/eski iOS/brauzerda — arzon taqlid: gradient + yorug' yuqori chet.
 *   Xiralashtirish yo'q, animatsiya yo'q: telefon uni bir marta chizadi.
 */
export const GlassFill = memo(function GlassFill({ tone = 'light', radius = 0, real = false }: { tone?: GlassTone; radius?: number; real?: boolean }) {
  const g = glass[tone];
  if (real && LIQUID_GLASS) {
    return <GlassView pointerEvents="none" glassEffectStyle={tone === 'clear' ? 'clear' : 'regular'} tintColor={g.tint} style={[fill, { borderRadius: radius }]} />;
  }
  return (
    <View pointerEvents="none" style={[fill, { borderRadius: radius }, styles.clip]}>
      <LinearGradient colors={g.colors} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={fill} />
      {g.sheen ? <LinearGradient colors={SHEEN} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sheen} /> : null}
      <View style={[fill, styles.rim, { borderRadius: radius, borderTopColor: g.rimTop, borderLeftColor: g.rim, borderRightColor: g.rim, borderBottomColor: g.rimBottom }]} />
    </View>
  );
});

/** Rangli shisha tugmaning yuqori yarmidagi yumshoq yorug'lik (yorug' tepadan tushgandek). */
const SHEEN = ['rgba(255,255,255,0.24)', 'rgba(255,255,255,0)'] as const;

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
  rim: { borderWidth: 1 },
});
