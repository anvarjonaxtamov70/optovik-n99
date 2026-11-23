import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, shadow, type GlassTone } from '../../theme/tokens';
import { GlassFill, LIQUID_GLASS } from './Glass';
import { Icon, type IconName } from './Icon';
import { PressableScale, PressOverlay } from './PressableScale';
import { Txt } from './Txt';

/** Eski `bg` qiymatlari qaysi shisha tusiga mos keladi. */
function toneFor(bg: string): GlassTone | null {
  if (bg === colors.white || bg === colors.surfaceAlt) return 'light';
  if (bg === colors.tint) return 'tint';
  if (bg === colors.primary) return 'primary';
  if (bg === colors.saleSoft) return 'dangerSoft';
  if (bg === colors.onBrandGlass) return 'onDark';
  return null;
}

/**
 * Yumaloq ikonka-tugma, «shisha» uslubida.
 * `elevated` — rasm yoki ro'yxat ustida suzib turadi: iOS 26 da haqiqiy shisha (orqadagi rasm ko'rinadi),
 * boshqa joyda yarim shaffof oq shisha taqlidi.
 */
export function IconButton({
  icon, onPress, label, size = 44, color = colors.ink, bg = colors.white, badge, elevated, style, iconSize, tone: forced,
}: {
  icon: IconName; onPress?: () => void; label: string; size?: number; color?: string; bg?: string;
  badge?: number; elevated?: boolean; style?: StyleProp<ViewStyle>; iconSize?: number; tone?: GlassTone;
}) {
  const tone = forced ?? (elevated ? 'clear' : toneFor(bg));
  const real = !!elevated && LIQUID_GLASS;
  // Shaffof shisha ostidagi Android soyasi shisha orqali "kir" bo'lib ko'rinadi — u yerda soya yo'q.
  const lift = elevated && !real && Platform.OS !== 'android' ? shadow.xs : null;
  const face = tone === 'clear' ? 'transparent' : bg;
  return (
    <PressableScale
      onPress={onPress}
      feedback="tap"
      scaleTo={0.92}
      accessibilityLabel={label}
      hitSlop={6}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: face }, styles.center, lift, style]}
    >
      {tone ? <GlassFill tone={tone} radius={size / 2} real={real} /> : null}
      {bg !== 'transparent' || tone ? <PressOverlay color={colors.ink} max={0.07} radius={size / 2} /> : null}
      <Icon name={icon} size={iconSize ?? Math.round(size * 0.5)} color={color} />
      {!!badge && badge > 0 && (
        <View style={styles.badge}><Txt variant="tiny" color={colors.white} style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Txt></View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.sale, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
