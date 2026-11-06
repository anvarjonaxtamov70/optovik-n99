import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useT } from '../../i18n';
import { colors } from '../../theme/tokens';
import { Txt } from '../ui/Txt';
import { LOGO, N_PATH, NINES, RING_LENGTH, tailPolygon } from './geometry';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const WIDTH = 210;
const HEIGHT = (WIDTH * LOGO.height) / LOGO.width;

/**
 * Ilova ochilganda: tabiiy splash bilan bir xil kadrdan boshlanadi (ko'k fon + oq logotip),
 * so'ng g'ildiraklar "aylanadi", gupchaklar yonadi, yo'l chizig'i yorishadi va ekran yumshoq ochiladi.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const spin = useSharedValue(0);
  const hub = useSharedValue(1);
  const glow = useSharedValue(0);
  const road = useSharedValue(0);
  const copy = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    spin.value = withTiming(1, { duration: 900, easing: Easing.bezier(0.45, 0, 0.2, 1) });
    hub.value = withDelay(320, withSequence(withSpring(1.75, { damping: 8, stiffness: 260 }), withSpring(1, { damping: 12, stiffness: 200 })));
    glow.value = withDelay(340, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) }));
    road.value = withDelay(180, withTiming(1, { duration: 900, easing: Easing.bezier(0.22, 1, 0.36, 1) }));
    copy.value = withDelay(520, withTiming(1, { duration: 420 }));
    exit.value = withDelay(1350, withTiming(1, { duration: 420, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) scheduleOnRN(onDone);
    }));
  }, [spin, hub, glow, road, copy, exit, onDone]);

  const arc = useAnimatedProps(() => ({ strokeDashoffset: RING_LENGTH * (1 - spin.value * 2), strokeOpacity: Math.sin(spin.value * Math.PI) }));
  const hubProps = useAnimatedProps(() => ({ r: LOGO.hubR * hub.value }));
  const glowProps = useAnimatedProps(() => ({ r: LOGO.hubR + glow.value * 26, opacity: 0.55 * (1 - glow.value) }));
  const roadStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: road.value }], opacity: 0.35 + road.value * 0.65 }));
  const copyStyle = useAnimatedStyle(() => ({ opacity: copy.value, transform: [{ translateY: (1 - copy.value) * 10 }] }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - exit.value * 0.12 }, { translateY: -exit.value * 18 }] }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={[colors.primary, colors.primary, colors.primaryDark]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} />
      <Animated.View style={[styles.center, logoStyle]}>
        <Svg width={WIDTH} height={HEIGHT} viewBox={`-10 -10 ${LOGO.width + 20} ${LOGO.height + 20}`}>
          <Path d={N_PATH} stroke={colors.white} strokeWidth={LOGO.stroke} fill="none" />
          {NINES.map(({ cx, cy }) => (
            <G9 key={cx} cx={cx} cy={cy} arc={arc} hubProps={hubProps} glowProps={glowProps} />
          ))}
        </Svg>
        <View style={styles.roadBox}>
          <Animated.View style={[styles.road, roadStyle]}>
            <LinearGradient colors={['rgba(142,209,255,0)', colors.sky, 'rgba(142,209,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
        <Animated.View style={copyStyle}>
          <Txt variant="bodyStrong" color={colors.white} center style={styles.tagline}>{t('app.tagline')}</Txt>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

function G9({ cx, cy, arc, hubProps, glowProps }: { cx: number; cy: number; arc: object; hubProps: object; glowProps: object }) {
  return (
    <>
      <AnimatedCircle cx={cx} cy={cy} fill={colors.sky} animatedProps={glowProps} />
      <Circle cx={cx} cy={cy} r={LOGO.ringR} stroke={colors.white} strokeWidth={LOGO.stroke} fill="none" />
      <AnimatedCircle cx={cx} cy={cy} r={LOGO.ringR} stroke={colors.sky} strokeWidth={LOGO.stroke * 0.42} fill="none" strokeLinecap="round"
        strokeDasharray={[RING_LENGTH * 0.18, RING_LENGTH * 0.82]} animatedProps={arc} transform={`rotate(-90 ${cx} ${cy})`} />
      <Polygon points={tailPolygon(cx, cy)} fill={colors.white} />
      <AnimatedCircle cx={cx} cy={cy} fill={colors.sky} animatedProps={hubProps} />
    </>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 9999, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  roadBox: { width: WIDTH * 1.05, height: 4, marginTop: 14, alignItems: 'center' },
  road: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  tagline: { marginTop: 22, opacity: 0.92 },
});

