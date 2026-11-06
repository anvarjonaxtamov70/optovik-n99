import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

import { colors, gradients } from '../../theme/tokens';

/** Yuklanish joyi — ustidan yorug'lik "yugurib" o'tadi. */
export function Skeleton({ width = '100%', height = 14, radius = 8, style }: {
  width?: DimensionValue; height?: DimensionValue; radius?: number; style?: StyleProp<ViewStyle>;
}) {
  const [w, setW] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    x.value = withRepeat(withTiming(1, { duration: 1150, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(x);
  }, [x]);
  const shine = useAnimatedStyle(() => ({ transform: [{ translateX: -w + x.value * w * 2 }] }));
  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} style={[{ width, height, borderRadius: radius }, styles.base, style]}>
      {w > 0 && (
        <Animated.View style={[StyleSheet.absoluteFill, shine]}>
          <LinearGradient colors={gradients.shimmer} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.photo, overflow: 'hidden' },
});
