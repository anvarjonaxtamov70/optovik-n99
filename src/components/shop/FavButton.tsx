import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import { useT } from '../../i18n';
import { haptic } from '../../lib/haptics';
import { prefs, useIsFavorite } from '../../state/prefs';
import { spring } from '../../theme/motion';
import { colors, shadow } from '../../theme/tokens';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';

const DOTS = [0, 1, 2, 3, 4, 5];

/** Yurakcha: qo'shilganda "sakraydi" va atrofga uchqunlar sochiladi. */
export function FavButton({ id, name, size = 34, floating = true }: { id: string; name: string; size?: number; floating?: boolean }) {
  const saved = useIsFavorite(id);
  const { t } = useT();
  const scale = useSharedValue(1);
  const burst = useSharedValue(1);
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPress = () => {
    const added = prefs.toggleFavorite(id);
    if (added) {
      haptic.light();
      // Yurak bir marta "uradi" — chayqalib turmaydi.
      scale.set(withSequence(withTiming(1.22, { duration: 120, easing: Easing.out(Easing.quad) }), withSpring(1, spring.snappy)));
      burst.set(0);
      burst.set(withTiming(1, { duration: 450, easing: Easing.out(Easing.quad) }));
    } else {
      haptic.tap();
      scale.set(withSequence(withTiming(0.85, { duration: 90 }), withSpring(1, spring.snappy)));
    }
  };
  return (
    <PressableScale onPress={onPress} scaleTo={0.9} hitSlop={8} accessibilityRole="button" accessibilityState={{ selected: saved }}
      accessibilityLabel={`${name}: ${saved ? t('product.favRemoved') : t('product.favAdded')}`}
      style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }, floating && styles.floating, floating && shadow.soft]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {DOTS.map((i) => <Dot key={i} i={i} burst={burst} size={size} />)}
      </View>
      <Animated.View style={heart}>
        <Icon name={saved ? 'heart' : 'heart-outline'} size={size * 0.56} color={saved ? colors.sale : colors.ink} />
      </Animated.View>
    </PressableScale>
  );
}

function Dot({ i, burst, size }: { i: number; burst: SharedValue<number>; size: number }) {
  const angle = (i / DOTS.length) * Math.PI * 2;
  const style = useAnimatedStyle(() => {
    const d = burst.value * size * 0.62;
    return {
      opacity: burst.value >= 1 ? 0 : 1 - burst.value,
      transform: [{ translateX: Math.cos(angle) * d }, { translateY: Math.sin(angle) * d }, { scale: 1 - burst.value * 0.5 }],
    };
  });
  return <Animated.View style={[styles.dot, { left: size / 2 - 3, top: size / 2 - 3, backgroundColor: i % 2 ? colors.sale : colors.skyStrong }, style]} />;
}

const styles = StyleSheet.create({
  btn: { alignItems: 'center', justifyContent: 'center' },
  // Shaffof bo'lmagan oq fon: iOS soyani tez chizadi (yarim shaffofda har kadr qayta hisoblaydi).
  floating: { backgroundColor: colors.white },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
});
