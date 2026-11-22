import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients, radius, shadow } from '../../theme/tokens';
import { Icon, type IconName } from './Icon';
import { PressableScale, PressOverlay } from './PressableScale';
import { Txt } from './Txt';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'white' | 'outline';
type Size = 'sm' | 'md' | 'lg';

/** Soya chiziladigan tashqi qobiqning foni: shaffof bo'lmasa, soya tez va to'g'ri chiziladi. */
const FACE: Record<Variant, string> = {
  primary: colors.primary, danger: colors.sale, secondary: colors.tint, white: colors.white, outline: colors.white, ghost: 'transparent',
};

/**
 * Tugma: nozik soya, bosilganda 3% kichrayib 1–1.5 px pastga botadi va biroz qorayadi,
 * qo'yib yuborilganda yumshoq qaytadi.
 */
export function Button({
  title, onPress, variant = 'primary', size = 'md', icon, iconRight, loading, disabled, style, full = true, children, accessibilityLabel,
}: {
  title?: string; onPress?: () => void; variant?: Variant; size?: Size; icon?: IconName; iconRight?: IconName;
  loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; full?: boolean; children?: ReactNode; accessibilityLabel?: string;
}) {
  // Eng kichik tugma ham barmoq uchun 44 px dan kam bo'lmaydi (Apple/Google tavsiyasi).
  const height = size === 'lg' ? 56 : size === 'md' ? 48 : 44;
  const r = size === 'sm' ? radius.sm : radius.md;
  const filled = variant === 'primary' || variant === 'danger';
  const fg = filled ? colors.white : colors.primary;
  const isOff = disabled || loading;
  const lift = isOff || variant === 'ghost' ? null : filled ? (variant === 'danger' ? shadow.danger : shadow.button) : shadow.xs;
  const content = (
    <View style={[styles.row, { minHeight: height, paddingHorizontal: size === 'sm' ? 14 : 20 }]}>
      {loading ? <ActivityIndicator color={fg} /> : <>
        {icon && <Icon name={icon} size={size === 'sm' ? 17 : 20} color={fg} />}
        {title ? <Txt variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'} color={fg} numberOfLines={1} style={styles.label}>{title}</Txt> : null}
        {children}
        {iconRight && <Icon name={iconRight} size={size === 'sm' ? 16 : 18} color={fg} />}
      </>}
    </View>
  );
  return (
    <PressableScale
      onPress={onPress}
      disabled={isOff}
      feedback="light"
      scaleTo={0.97}
      depth={size === 'lg' ? 1.5 : 1}
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!isOff, busy: !!loading }}
      style={[full && styles.full, { borderRadius: r, backgroundColor: FACE[variant] }, lift, style]}
    >
      {filled ? (
        <LinearGradient colors={variant === 'danger' ? [colors.saleBright, colors.sale] : gradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.fill, { borderRadius: r }]}>
          <PressOverlay color={colors.ink} max={0.14} radius={r} />
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.fill, { borderRadius: r }, variant === 'secondary' && styles.secondary, variant === 'white' && styles.white,
          variant === 'outline' && styles.outline]}>
          <PressOverlay color={colors.primary} max={0.09} radius={r} />
          {content}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  fill: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { flexShrink: 1 },
  secondary: { backgroundColor: colors.tint },
  white: { backgroundColor: colors.white },
  outline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.tintStrong },
});
