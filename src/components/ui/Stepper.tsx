import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { colors, radius } from '../../theme/tokens';
import { GlassFill } from './Glass';
import { Icon } from './Icon';
import { PressableScale, PressOverlay } from './PressableScale';
import { Txt } from './Txt';

/** − 2 + — bosilgan tomon biroz qorayadi, raqam almashganda yumshoq almashadi. */
export function Stepper({ value, onInc, onDec, max, size = 'md', tone = 'tint', labelInc, labelDec, trashAtOne = true }: {
  value: number; onInc: () => void; onDec: () => void; max: number; size?: 'sm' | 'md' | 'lg'; tone?: 'tint' | 'primary';
  labelInc: string; labelDec: string; trashAtOne?: boolean;
}) {
  // Barmoq bilan bosish uchun eng kichik o'lcham ham 44 px dan kam bo'lmaydi.
  const h = size === 'lg' ? 52 : size === 'md' ? 46 : 44;
  const fg = tone === 'primary' ? colors.white : colors.primary;
  const atMax = value >= max;
  // Raqam faqat shu yerda bosilganda almashish animatsiyasini oladi (ekran ochilganda emas).
  const [touched, setTouched] = useState(false);
  const inc = () => { setTouched(true); onInc(); };
  const dec = () => { setTouched(true); onDec(); };
  return (
    <View style={[styles.wrap, { height: h, borderRadius: size === 'lg' ? radius.md : radius.sm + 2, backgroundColor: tone === 'primary' ? colors.primary : colors.tint }]}>
      <GlassFill tone={tone === 'primary' ? 'primary' : 'tint'} radius={size === 'lg' ? radius.md : radius.sm + 2} />
      <PressableScale onPress={dec} disabled={!trashAtOne && value <= 1} feedback="tap" scaleTo={0.9} accessibilityLabel={labelDec} hitSlop={4} style={[styles.btn, { width: h }]}>
        <PressOverlay color={colors.ink} max={0.1} />
        <Icon name={trashAtOne && value <= 1 ? 'trash-outline' : 'remove'} size={size === 'sm' ? 17 : 20} color={fg} />
      </PressableScale>
      <View style={styles.valueBox} accessibilityLiveRegion="polite">
        <Animated.View key={value} entering={touched ? FadeIn.duration(140) : undefined} exiting={touched ? FadeOut.duration(90) : undefined} style={styles.value}>
          <Txt variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'} color={fg} style={styles.digits}>{value}</Txt>
        </Animated.View>
      </View>
      <PressableScale onPress={inc} disabled={atMax} feedback="tap" scaleTo={0.9} accessibilityLabel={labelInc} hitSlop={4} style={[styles.btn, { width: h }]}>
        <PressOverlay color={colors.ink} max={0.1} />
        <Icon name="add" size={size === 'sm' ? 18 : 21} color={fg} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  btn: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  valueBox: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', height: '100%' },
  // Eski va yangi raqam bir joyda ustma-ust almashadi.
  value: { position: 'absolute' },
  digits: { fontVariant: ['tabular-nums'] },
});
