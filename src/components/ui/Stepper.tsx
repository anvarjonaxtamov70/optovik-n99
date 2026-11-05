import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

import { colors, radius } from '../../theme/tokens';
import { Icon } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

/** − 2 + — miqdor o'zgarganda raqam yuqoriga "sakraydi". */
export function Stepper({ value, onInc, onDec, max, size = 'md', tone = 'tint', labelInc, labelDec, trashAtOne = true }: {
  value: number; onInc: () => void; onDec: () => void; max: number; size?: 'sm' | 'md' | 'lg'; tone?: 'tint' | 'primary';
  labelInc: string; labelDec: string; trashAtOne?: boolean;
}) {
  const h = size === 'lg' ? 52 : size === 'md' ? 40 : 34;
  const fg = tone === 'primary' ? colors.white : colors.primary;
  const atMax = value >= max;
  return (
    <View style={[styles.wrap, { height: h, borderRadius: size === 'lg' ? radius.md : radius.sm, backgroundColor: tone === 'primary' ? colors.primary : colors.tint }]}>
      <PressableScale onPress={onDec} disabled={!trashAtOne && value <= 1} feedback="tap" scaleTo={0.85} accessibilityLabel={labelDec} hitSlop={4} style={[styles.btn, { width: h }]}>
        <Icon name={trashAtOne && value <= 1 ? 'trash-outline' : 'remove'} size={size === 'sm' ? 16 : 20} color={fg} />
      </PressableScale>
      <View style={styles.valueBox} accessibilityLiveRegion="polite">
        <Animated.View key={value} entering={FadeInDown.duration(180)} exiting={FadeOutUp.duration(120)}>
          <Txt variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'} color={fg} style={styles.value}>{value}</Txt>
        </Animated.View>
      </View>
      <PressableScale onPress={onInc} disabled={atMax} feedback="tap" scaleTo={0.85} accessibilityLabel={labelInc} hitSlop={4} style={[styles.btn, { width: h }]}>
        <Icon name="add" size={size === 'sm' ? 17 : 21} color={fg} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' },
  btn: { height: '100%', alignItems: 'center', justifyContent: 'center' },
  valueBox: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', height: '100%' },
  value: { fontVariant: ['tabular-nums'] },
});
