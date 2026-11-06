import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, ZoomIn } from 'react-native-reanimated';

import { spring } from '../../theme/motion';
import { colors, radius, shadow } from '../../theme/tokens';
import { Icon, PartIcon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

export function Card({ children, style, padded = true }: { children: ReactNode; style?: StyleProp<ViewStyle>; padded?: boolean }) {
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

export function SectionTitle({ title, action, onAction, style }: { title: string; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.section, style]}>
      <Txt variant="h2" accessibilityRole="header" style={styles.flex} numberOfLines={1}>{title}</Txt>
      {action && onAction ? (
        <PressableScale onPress={onAction} style={styles.sectionAction} accessibilityLabel={`${title}: ${action}`} hitSlop={8}>
          <Txt variant="smallStrong" color={colors.primary}>{action}</Txt>
          <Icon name="chevron-forward" size={16} color={colors.primary} />
        </PressableScale>
      ) : null}
    </View>
  );
}

export function Chip({ label, selected, onPress, icon, partIcon, count }: {
  label: string; selected?: boolean; onPress?: () => void; icon?: IconName; partIcon?: string; count?: number;
}) {
  return (
    <PressableScale onPress={onPress} feedback="tap" accessibilityState={{ selected: !!selected }} accessibilityLabel={label}
      style={[styles.chip, selected ? styles.chipOn : styles.chipOff]}>
      {icon ? <Icon name={icon} size={16} color={selected ? colors.white : colors.primary} /> : null}
      {partIcon ? <PartIcon name={partIcon} size={17} color={selected ? colors.white : colors.primary} /> : null}
      <Txt variant="smallStrong" color={selected ? colors.white : colors.ink} numberOfLines={1}>{label}</Txt>
      {count != null ? <Txt variant="tiny" color={selected ? colors.sky : colors.faint}>{count}</Txt> : null}
    </PressableScale>
  );
}

export function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  return (
    <PressableScale onPress={onPress} feedback="tap" scaleTo={0.85} hitSlop={10} accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label}
      style={[styles.check, checked ? styles.checkOn : styles.checkOff]}>
      {checked ? <Animated.View entering={ZoomIn.springify().damping(14)}><Icon name="checkmark" size={16} color={colors.white} /></Animated.View> : null}
    </PressableScale>
  );
}

export function Radio({ checked }: { checked: boolean }) {
  return (
    <View style={[styles.radio, checked && styles.radioOn]}>
      {checked ? <Animated.View entering={ZoomIn.springify().damping(14)} style={styles.radioDot} /> : null}
    </View>
  );
}

/** Ikki-uch variantli tanlagich: oq "kapsula" tanlangan tomonga suriladi. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string; icon?: IconName }[]; onChange: (v: T) => void }) {
  const [w, setW] = useState(0);
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const x = useSharedValue(0);
  const segW = w / options.length;
  useEffect(() => { x.value = withSpring(index * segW, spring.snappy); }, [index, segW, x]);
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={styles.seg} onLayout={(e) => setW(e.nativeEvent.layout.width - 8)} accessibilityRole="tablist">
      {w > 0 ? <Animated.View style={[styles.segThumb, shadow.soft, { width: segW }, thumb]} /> : null}
      {options.map((o) => (
        <PressableScale key={o.value} onPress={() => onChange(o.value)} feedback="tap" scaleTo={0.97} accessibilityRole="tab" accessibilityState={{ selected: o.value === value }}
          accessibilityLabel={o.label} style={styles.segItem}>
          {o.icon ? <Icon name={o.icon} size={17} color={o.value === value ? colors.primary : colors.muted} /> : null}
          <Txt variant="smallStrong" color={o.value === value ? colors.ink : colors.muted} numberOfLines={1}>{o.label}</Txt>
        </PressableScale>
      ))}
    </View>
  );
}

export function ListRow({ icon, title, subtitle, value, onPress, danger, right, last }: {
  icon?: IconName; title: string; subtitle?: string; value?: string; onPress?: () => void; danger?: boolean; right?: ReactNode; last?: boolean;
}) {
  const body = (
    <View style={[styles.row, !last && styles.rowLine]}>
      {icon ? <View style={[styles.rowIcon, danger && { backgroundColor: colors.saleSoft }]}><Icon name={icon} size={19} color={danger ? colors.sale : colors.primary} /></View> : null}
      <View style={styles.flex}>
        <Txt variant="bodyStrong" color={danger ? colors.sale : colors.ink} numberOfLines={1}>{title}</Txt>
        {subtitle ? <Txt variant="small" numberOfLines={2}>{subtitle}</Txt> : null}
      </View>
      {value ? <Txt variant="small" numberOfLines={1} style={styles.rowValue}>{value}</Txt> : null}
      {right ?? (onPress ? <Icon name="chevron-forward" size={18} color={colors.faint} /> : null)}
    </View>
  );
  return onPress ? <PressableScale onPress={onPress} scaleTo={0.985} accessibilityLabel={title}>{body}</PressableScale> : body;
}

export function SwitchRow({ title, subtitle, value, onChange }: { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View style={[styles.row, styles.rowLine]}>
      <View style={styles.flex}>
        <Txt variant="bodyStrong">{title}</Txt>
        {subtitle ? <Txt variant="small">{subtitle}</Txt> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.lineStrong }} thumbColor={colors.white} accessibilityLabel={title} />
    </View>
  );
}

export function Pill({ text, tone = 'tint', style }: { text: string; tone?: 'tint' | 'sale' | 'success' | 'warning' | 'dark' | 'muted'; style?: StyleProp<ViewStyle> }) {
  const map = {
    tint: [colors.tint, colors.primary], sale: [colors.sale, colors.white], success: [colors.successSoft, colors.success],
    warning: [colors.warningSoft, colors.warning], dark: [colors.ink, colors.white], muted: [colors.surfaceAlt, colors.muted],
  } as const;
  const [bg, fg] = map[tone];
  return <View style={[styles.pill, { backgroundColor: bg }, style]}><Txt variant="tiny" color={fg} style={styles.pillText} numberOfLines={1}>{text}</Txt></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, ...shadow.soft },
  padded: { padding: 16 },
  section: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingVertical: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 38, borderRadius: radius.pill },
  chipOn: { backgroundColor: colors.primary },
  chipOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  check: { width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary },
  checkOff: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.lineStrong },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.lineStrong, alignItems: 'center', justifyContent: 'center' },
  radioOn: { borderColor: colors.primary },
  radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.primary },
  seg: { flexDirection: 'row', backgroundColor: colors.tint, borderRadius: radius.md, padding: 4 },
  segThumb: { position: 'absolute', top: 4, bottom: 4, left: 4, borderRadius: radius.sm, backgroundColor: colors.white },
  segItem: { flex: 1, flexDirection: 'row', gap: 6, minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, minHeight: 56 },
  rowLine: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  rowIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  rowValue: { maxWidth: 140 },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 11 },
});
