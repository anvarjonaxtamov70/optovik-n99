import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '../../lib/haptics';
import { spring } from '../../theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  feedback?: 'tap' | 'light' | 'medium' | false;
};

/** Bosilganda yengil kichrayadigan tugma — ilovadagi barcha bosiladigan joylar uchun asos. */
export function PressableScale({ scaleTo = 0.96, style, onPressIn, onPressOut, onPress, feedback = false, disabled, ...rest }: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      {...rest}
      onPressIn={(e) => { scale.set(withSpring(scaleTo, spring.snappy)); onPressIn?.(e); }}
      onPressOut={(e) => { scale.set(withSpring(1, spring.bouncy)); onPressOut?.(e); }}
      onPress={(e) => { if (feedback) haptic[feedback](); onPress?.(e); }}
      style={[style, animated, disabled ? { opacity: 0.55 } : null]}
    />
  );
}
