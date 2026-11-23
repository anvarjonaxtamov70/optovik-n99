import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, shadow, type GlassTone } from '../../theme/tokens';
import { GlassFill } from './Glass';
import { Icon, type IconName } from './Icon';
import { PressableScale, PressOverlay } from './PressableScale';
import { Txt } from './Txt';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'white' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const TONE: Record<Exclude<Variant, 'ghost'>, GlassTone> = {
  primary: 'primary', danger: 'danger', secondary: 'tint', white: 'light', outline: 'light',
};

/** Soya chiziladigan tashqi qobiqning foni: shaffof bo'lmasa, soya tez va to'g'ri chiziladi. */
const FACE: Record<Variant | 'off', string> = {
  primary: colors.primary, danger: colors.sale, secondary: colors.tint, white: colors.white, outline: colors.white, ghost: 'transparent', off: '#ECEFF3',
};

/**
 * Tugma — «shisha» uslubida (iOS 26 da haqiqiy Liquid Glass, boshqa joyda arzon taqlid).
 * Bosilganda 3% kichrayib 1–1.5 px pastga botadi va biroz qorayadi, qo'yib yuborilganda yumshoq qaytadi.
 * O'chirilgan tugma xira-ko'k emas, tinch kulrang bo'ladi — "buzilgan"dek ko'rinmaydi.
 */
export function Button({
  title, onPress, variant = 'primary', size = 'md', icon, iconRight, loading, disabled, style, full = true, children, accessibilityLabel,
}: {
  title?: string; onPress?: () => void; variant?: Variant; size?: Size; icon?: IconName; iconRight?: IconName;
  loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; full?: boolean; children?: ReactNode; accessibilityLabel?: string;
}) {
  // Eng kichik tugma ham barmoq uchun 44 px dan kam bo'lmaydi (Apple/Google tavsiyasi).
  const height = size === 'lg' ? 56 : size === 'md' ? 48 : 44;
  const r = size === 'sm' ? radius.sm + 2 : radius.md;
  const off = !!disabled && !loading;
  const busy = !!loading;
  const tone: GlassTone | null = off ? 'muted' : variant === 'ghost' ? null : TONE[variant];
  const filled = variant === 'primary' || variant === 'danger';
  const fg = off ? colors.faint : filled ? colors.white : colors.primary;
  const lift = off || busy || variant === 'ghost' ? null : filled ? (variant === 'danger' ? shadow.danger : shadow.button) : shadow.xs;
  return (
    <PressableScale
      onPress={onPress}
      disabled={off || busy}
      dimWhenDisabled={false}
      feedback="light"
      scaleTo={0.97}
      depth={size === 'lg' ? 1.5 : 1}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: off || busy, busy }}
      style={[full && styles.full, { borderRadius: r, backgroundColor: FACE[off ? 'off' : variant] }, lift, style]}
    >
      {tone ? <GlassFill tone={tone} radius={r} real={!off} /> : null}
      <PressOverlay color={filled && !off ? colors.ink : colors.primary} max={filled && !off ? 0.14 : 0.09} radius={r} />
      <View style={[styles.row, { minHeight: height, paddingHorizontal: size === 'sm' ? 14 : 20 }]}>
        {busy ? <ActivityIndicator color={fg} /> : <>
          {icon && <Icon name={icon} size={size === 'sm' ? 17 : 20} color={fg} />}
          {title ? <Txt variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'} color={fg} numberOfLines={1} style={styles.label}>{title}</Txt> : null}
          {children}
          {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} color={fg} />}
        </>}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { flexShrink: 1 },
});
