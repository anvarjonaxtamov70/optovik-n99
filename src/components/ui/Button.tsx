import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, gradients, radius, shadow } from '../../theme/tokens';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'white' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export function Button({
  title, onPress, variant = 'primary', size = 'md', icon, iconRight, loading, disabled, style, full = true, children, accessibilityLabel,
}: {
  title?: string; onPress?: () => void; variant?: Variant; size?: Size; icon?: IconName; iconRight?: IconName;
  loading?: boolean; disabled?: boolean; style?: StyleProp<ViewStyle>; full?: boolean; children?: ReactNode; accessibilityLabel?: string;
}) {
  const height = size === 'lg' ? 56 : size === 'md' ? 48 : 38;
  const fg = variant === 'primary' || variant === 'danger' ? colors.white : variant === 'white' ? colors.primary : variant === 'outline' ? colors.primary : colors.primary;
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
  const isOff = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={isOff}
      feedback="light"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: !!isOff, busy: !!loading }}
      style={[full && styles.full, styles.base, { borderRadius: size === 'sm' ? radius.sm : radius.md }, variant === 'primary' && !isOff && shadow.button, style]}
    >
      {variant === 'primary' || variant === 'danger' ? (
        <LinearGradient colors={variant === 'danger' ? ['#EF5350', colors.sale] : gradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fill, { borderRadius: size === 'sm' ? radius.sm : radius.md }]}>
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.fill, { borderRadius: size === 'sm' ? radius.sm : radius.md }, variant === 'secondary' && styles.secondary, variant === 'white' && styles.white,
          variant === 'outline' && styles.outline]}>
          {content}
        </View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  base: { overflow: 'visible' },
  fill: { overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { flexShrink: 1 },
  secondary: { backgroundColor: colors.tint },
  white: { backgroundColor: colors.white },
  outline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.tintStrong },
});
