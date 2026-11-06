import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, FadeInUp, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { colors, gradients } from '../../theme/tokens';
import { Button } from './Button';
import { Icon, PartIcon, type IconName } from './Icon';
import { Txt } from './Txt';

/** Bo'sh holat: ikonka sekin "suzadi", atrofida halqa nafas oladi. */
export function EmptyState({ icon, partIcon, title, text, action, compact }: {
  icon?: IconName; partIcon?: string; title: string; text?: string; action?: { label: string; onPress: () => void }; compact?: boolean;
}) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(t);
  }, [t]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateY: -6 + t.value * 12 }] }));
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.value * 0.08 }], opacity: 0.55 - t.value * 0.25 }));
  const size = compact ? 96 : 124;
  return (
    <Animated.View entering={FadeInUp.duration(380)} style={[styles.wrap, compact && styles.compact]}>
      <View style={{ width: size + 40, height: size + 40, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View style={[styles.ring, { width: size + 36, height: size + 36, borderRadius: (size + 36) / 2 }, ring]} />
        <Animated.View style={float}>
          <LinearGradient colors={gradients.sky} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
            {partIcon ? <PartIcon name={partIcon} size={size * 0.44} color={colors.primary} /> : <Icon name={icon ?? 'cube-outline'} size={size * 0.42} color={colors.primary} />}
          </LinearGradient>
        </Animated.View>
      </View>
      <Txt variant="h2" center style={styles.title}>{title}</Txt>
      {text ? <Txt variant="body" color={colors.muted} center style={styles.text}>{text}</Txt> : null}
      {action ? <Button title={action.label} onPress={action.onPress} full={false} style={styles.btn} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 40, gap: 6 },
  compact: { paddingVertical: 20 },
  ring: { position: 'absolute', borderWidth: 2, borderColor: colors.tintStrong },
  title: { marginTop: 10 },
  text: { maxWidth: 320 },
  btn: { marginTop: 14, minWidth: 200 },
});
