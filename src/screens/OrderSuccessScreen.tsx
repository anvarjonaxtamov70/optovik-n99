import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, FadeInDown, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming, type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';

import { Button } from '../components/ui/Button';
import { Txt } from '../components/ui/Txt';
import { orderNumber } from '../domain/order';
import { displayPhone } from '../domain/phone';
import { useT } from '../i18n';
import { colors, fill, radius, shadow } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const R = 52;
const C = 2 * Math.PI * R;
const CHECK = 'M42 62 L56 76 L82 48';
const CHECK_LEN = 60;
const CONFETTI = Array.from({ length: 18 }, (_, i) => i);
const CONFETTI_COLORS = [colors.primary, colors.sky, colors.sale, '#FFC94D', colors.success, colors.primaryBright];

export default function OrderSuccessScreen() {
  const { id, raqam, phone } = useLocalSearchParams<{ id: string; raqam?: string; phone?: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const ring = useSharedValue(0);
  const check = useSharedValue(0);
  const pop = useSharedValue(0.6);
  const burst = useSharedValue(0);

  useEffect(() => {
    ring.value = withTiming(1, { duration: 650, easing: Easing.bezier(0.65, 0, 0.35, 1) });
    check.value = withDelay(520, withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }));
    pop.value = withDelay(480, withSpring(1, { damping: 9, stiffness: 220 }));
    burst.value = withDelay(620, withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }));
  }, [ring, check, pop, burst]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: C * (1 - ring.value) }));
  const checkProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LEN * (1 - check.value) }));
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.center}>
      <View style={styles.hero}>
        <View style={styles.burst} pointerEvents="none">
          {CONFETTI.map((i) => <Confetti key={i} i={i} burst={burst} />)}
        </View>
        <Animated.View style={popStyle}>
          <Svg width={128} height={128} viewBox="0 0 124 124">
            <Circle cx={62} cy={62} r={R} fill={colors.successSoft} />
            <AnimatedCircle cx={62} cy={62} r={R} stroke={colors.success} strokeWidth={6} fill="none" strokeLinecap="round"
              strokeDasharray={[C, C]} animatedProps={ringProps} transform="rotate(-90 62 62)" />
            <AnimatedPath d={CHECK} stroke={colors.success} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={[CHECK_LEN, CHECK_LEN]} animatedProps={checkProps} />
          </Svg>
        </Animated.View>
      </View>
      <Animated.View entering={FadeInDown.delay(700).duration(420)} style={styles.copy}>
        <Txt variant="hero" center>{t('success.title')}</Txt>
        <Txt variant="body" color={colors.muted} center>{t('success.text', { phone: phone ? displayPhone(phone) : '' })}</Txt>
        {raqam ? (
          <View style={[styles.number, shadow.soft]}>
            <Txt variant="label">{t('success.number')}</Txt>
            <Txt style={styles.numberText}>{orderNumber(Number(raqam))}</Txt>
          </View>
        ) : null}
      </Animated.View>
      </View>
      <Animated.View entering={FadeInDown.delay(900).duration(420)} style={styles.actions}>
        <Button title={t('success.track')} icon="navigate-outline" size="lg" onPress={() => router.replace({ pathname: '/orders/[id]', params: { id } })} />
        <Button title={t('success.continue')} variant="secondary" size="lg" onPress={() => router.dismissTo('/')} />
      </Animated.View>
    </View>
  );
}

function Confetti({ i, burst }: { i: number; burst: SharedValue<number> }) {
  const angle = (i / CONFETTI.length) * Math.PI * 2 + (i % 3) * 0.2;
  const dist = 90 + (i % 4) * 28;
  const size = 6 + (i % 3) * 3;
  const style = useAnimatedStyle(() => {
    const b = burst.value;
    return {
      opacity: b === 0 ? 0 : 1 - b * b,
      transform: [
        { translateX: Math.cos(angle) * dist * b },
        { translateY: Math.sin(angle) * dist * b + b * b * 70 },
        { rotate: `${b * (i % 2 ? 360 : -280)}deg` },
      ],
    };
  });
  return <Animated.View style={[styles.confetti, { width: size, height: size * (i % 2 ? 1 : 2), backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length] }, style]} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  center: { flex: 1, justifyContent: 'center', gap: 8 },
  hero: { alignItems: 'center', justifyContent: 'center', height: 220 },
  burst: { ...fill, alignItems: 'center', justifyContent: 'center' },
  confetti: { position: 'absolute', borderRadius: 2 },
  copy: { gap: 10, alignItems: 'center' },
  number: { marginTop: 10, alignItems: 'center', gap: 2, paddingHorizontal: 28, paddingVertical: 14, backgroundColor: colors.white, borderRadius: radius.lg },
  numberText: { fontFamily: 'Unbounded_700Bold', fontSize: 24, color: colors.primary, letterSpacing: 1 },
  actions: { gap: 10 },
});
