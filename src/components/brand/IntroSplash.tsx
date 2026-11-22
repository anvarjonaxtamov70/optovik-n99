import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';

import { useT } from '../../i18n';
import { ease } from '../../theme/motion';
import { colors } from '../../theme/tokens';
import { Txt } from '../ui/Txt';
import { LOGO, N_PATH, NINES, RING_LENGTH, tailPolygon } from './geometry';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const WIDTH = 210;
const HEIGHT = (WIDTH * LOGO.height) / LOGO.width;

/**
 * Ilova ochilganda: tabiiy splash bilan bir xil kadrdan boshlanadi (ko'k fon + oq logotip),
 * g'ildiraklar bir marta yumshoq "aylanadi", yo'l chizig'i cho'ziladi va ekran ochiladi.
 * Jami ~1.2 soniya (avval 1.8). Gupchaklarning "yonib-o'chishi" olib tashlandi. Katalog shu vaqtda orqada yuklanadi.
 */
export function IntroSplash({ onDone }: { onDone: () => void }) {
  const { t } = useT();
  const spin = useSharedValue(0);
  const road = useSharedValue(0);
  const copy = useSharedValue(0);
  const exit = useSharedValue(0);

  useEffect(() => {
    spin.set(withTiming(1, { duration: 700, easing: Easing.bezier(0.45, 0, 0.2, 1) }));
    road.set(withDelay(120, withTiming(1, { duration: 650, easing: ease.out })));
    copy.set(withDelay(300, withTiming(1, { duration: 320 })));
    exit.set(withDelay(900, withTiming(1, { duration: 300, easing: Easing.in(Easing.cubic) }, (done) => {
      if (done) scheduleOnRN(onDone);
    })));
  }, [spin, road, copy, exit, onDone]);

  const arc = useAnimatedProps(() => ({ strokeDashoffset: RING_LENGTH * (1 - spin.value * 2), strokeOpacity: Math.sin(spin.value * Math.PI) }));
  const roadStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: road.value }], opacity: 0.35 + road.value * 0.65 }));
  const copyStyle = useAnimatedStyle(() => ({ opacity: copy.value, transform: [{ translateY: (1 - copy.value) * 8 }] }));
  const logoStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - exit.value * 0.08 }, { translateY: -exit.value * 12 }] }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.value }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, rootStyle]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <LinearGradient colors={[colors.primary, colors.primary, colors.primaryDark]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} />
      <Animated.View style={[styles.center, logoStyle]}>
        <Svg width={WIDTH} height={HEIGHT} viewBox={`-10 -10 ${LOGO.width + 20} ${LOGO.height + 20}`}>
          <Path d={N_PATH} stroke={colors.white} strokeWidth={LOGO.stroke} fill="none" />
          {NINES.map(({ cx, cy }) => <G9 key={cx} cx={cx} cy={cy} arc={arc} />)}
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

function G9({ cx, cy, arc }: { cx: number; cy: number; arc: object }) {
  return (
    <>
      <Circle cx={cx} cy={cy} r={LOGO.ringR} stroke={colors.white} strokeWidth={LOGO.stroke} fill="none" />
      <AnimatedCircle cx={cx} cy={cy} r={LOGO.ringR} stroke={colors.sky} strokeWidth={LOGO.stroke * 0.42} fill="none" strokeLinecap="round"
        strokeDasharray={[RING_LENGTH * 0.18, RING_LENGTH * 0.82]} animatedProps={arc} transform={`rotate(-90 ${cx} ${cy})`} />
      <Polygon points={tailPolygon(cx, cy)} fill={colors.white} />
      <Circle cx={cx} cy={cy} r={LOGO.hubR} fill={colors.sky} />
    </>
  );
}

const styles = StyleSheet.create({
  // Ekran tegishlarini to'smaydi: intro paytida ham ilova javob beradi.
  root: { zIndex: 9999, alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' },
  center: { alignItems: 'center' },
  roadBox: { width: WIDTH * 1.05, height: 4, marginTop: 14, alignItems: 'center' },
  road: { width: '100%', height: 4, borderRadius: 2, overflow: 'hidden' },
  tagline: { marginTop: 22, opacity: 0.92 },
});
