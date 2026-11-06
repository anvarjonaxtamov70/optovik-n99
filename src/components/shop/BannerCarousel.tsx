import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  cancelAnimation, Easing, Extrapolation, interpolate, useAnimatedRef, useAnimatedScrollHandler, useAnimatedStyle,
  useSharedValue, withRepeat, withTiming, type SharedValue,
} from 'react-native-reanimated';

import type { Banner, BannerTheme } from '../../domain/content';
import { useT } from '../../i18n';
import { openLink } from '../../lib/nav';
import { colors, fonts, gradients, radius } from '../../theme/tokens';
import { Icon, PartIcon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { Txt } from '../ui/Txt';

const THEMES: Record<BannerTheme, { colors: readonly [string, string, ...string[]]; dark: boolean }> = {
  brand: { colors: gradients.brand, dark: true },
  night: { colors: gradients.night, dark: true },
  sky: { colors: gradients.sky, dark: false },
  sunrise: { colors: gradients.sunrise, dark: true },
  mint: { colors: gradients.mint, dark: false },
};

const ART = {
  gm: require('../../../assets/home/gm-parts.webp'),
  accessories: require('../../../assets/home/accessories.webp'),
};

const GAP = 10;
const AUTO_MS = 4800;

/** Bosh sahifa bannerlari: o'zi aylanadi, surilganda to'xtaydi, rasm parallaks bilan siljiydi. */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const { width } = useWindowDimensions();
  const cardW = Math.min(width, 760) - 32;
  const cardH = Math.round(Math.max(156, Math.min(cardW * 0.46, 230)));
  const interval = cardW + GAP;
  const ref = useAnimatedRef<Animated.ScrollView>();
  const x = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const touching = useRef(false);
  const indexRef = useRef(0);

  const onScroll = useAnimatedScrollHandler({ onScroll: (e) => { x.value = e.contentOffset.x; } });

  useEffect(() => {
    if (banners.length < 2) return;
    const id = setInterval(() => {
      if (touching.current) return;
      const next = (indexRef.current + 1) % banners.length;
      indexRef.current = next;
      setIndex(next);
      ref.current?.scrollTo({ x: next * interval, animated: true });
    }, AUTO_MS);
    return () => clearInterval(id);
  }, [banners.length, interval, ref]);

  if (!banners.length) return null;
  return (
    <View>
      <Animated.ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={interval}
        disableIntervalMomentum
        contentContainerStyle={{ paddingHorizontal: 16, gap: GAP }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => { touching.current = true; }}
        onMomentumScrollEnd={(e) => {
          touching.current = false;
          indexRef.current = Math.round(e.nativeEvent.contentOffset.x / interval);
          setIndex(indexRef.current);
        }}
      >
        {banners.map((b, i) => <BannerCard key={b.id} banner={b} i={i} x={x} interval={interval} width={cardW} height={cardH} />)}
      </Animated.ScrollView>
      {banners.length > 1 ? (
        <View style={styles.dots} accessibilityRole="adjustable" accessibilityValue={{ min: 1, max: banners.length, now: index + 1 }}>
          {banners.map((b, i) => <Dot key={b.id} i={i} x={x} interval={interval} />)}
        </View>
      ) : null}
    </View>
  );
}

function Dot({ i, x, interval }: { i: number; x: SharedValue<number>; interval: number }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(x.value / interval - i);
    const t = interpolate(d, [0, 1], [1, 0], Extrapolation.CLAMP);
    return { width: 7 + t * 15, opacity: 0.35 + t * 0.65 };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

function BannerCard({ banner: b, i, x, interval, width, height }: {
  banner: Banner; i: number; x: SharedValue<number>; interval: number; width: number; height: number;
}) {
  const { lang } = useT();
  const theme = THEMES[b.theme];
  const fg = theme.dark ? colors.white : colors.ink;
  const art = useAnimatedStyle(() => {
    const d = x.value - i * interval;
    return { transform: [{ translateX: d * -0.22 }, { scale: interpolate(Math.abs(d), [0, interval], [1, 0.9], Extrapolation.CLAMP) }] };
  });
  return (
    <PressableScale onPress={() => openLink(b.link, b.title[lang].replace(/\n/g, ' '))} scaleTo={0.98} feedback="tap"
      accessibilityLabel={`${b.title[lang].replace(/\n/g, ' ')}. ${b.cta[lang]}`}
      style={[styles.card, { width, height }]}>
      <LinearGradient colors={theme.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      <View style={[styles.circle, { width: height * 1.3, height: height * 1.3, right: -height * 0.45, top: -height * 0.5, borderColor: theme.dark ? 'rgba(255,255,255,0.10)' : 'rgba(33,115,177,0.08)' }]} />
      <View style={[styles.circle, { width: height * 0.7, height: height * 0.7, right: width * 0.32, bottom: -height * 0.42, borderColor: theme.dark ? 'rgba(255,255,255,0.08)' : 'rgba(33,115,177,0.07)' }]} />
      <Animated.View style={[styles.art, art]} pointerEvents="none">
        <BannerArt banner={b} height={height} dark={theme.dark} />
      </Animated.View>
      <View style={styles.copy}>
        <Txt style={[styles.title, { color: fg, fontSize: height > 190 ? 24 : 20, lineHeight: height > 190 ? 29 : 25 }]} numberOfLines={3}>{b.title[lang]}</Txt>
        {b.text[lang] ? <Txt variant="small" color={theme.dark ? 'rgba(255,255,255,0.86)' : colors.muted} numberOfLines={2} style={styles.text}>{b.text[lang]}</Txt> : null}
        <View style={[styles.cta, { backgroundColor: theme.dark ? colors.white : colors.primary }]}>
          <Txt variant="smallStrong" color={theme.dark ? colors.primary : colors.white}>{b.cta[lang]}</Txt>
          <Icon name="arrow-forward" size={15} color={theme.dark ? colors.primary : colors.white} />
        </View>
      </View>
    </PressableScale>
  );
}

function BannerArt({ banner: b, height, dark }: { banner: Banner; height: number; dark: boolean }) {
  const spin = useSharedValue(0);
  useEffect(() => {
    if (b.art !== 'sale') return;
    spin.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(spin);
  }, [b.art, spin]);
  const wobble = useAnimatedStyle(() => ({ transform: [{ rotate: `${-8 + spin.value * 16}deg` }, { scale: 1 + spin.value * 0.05 }] }));
  if (b.image) return <Image source={{ uri: b.image }} style={{ width: height * 1.05, height: height * 0.9 }} contentFit="contain" />;
  if (b.art === 'gm' || b.art === 'accessories') {
    return <Image source={ART[b.art]} style={{ width: height * 1.25, height: height * 0.84 }} contentFit="contain" />;
  }
  const iconColor = dark ? colors.white : colors.primary;
  const bubble = dark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.8)';
  if (b.art === 'sale') {
    return (
      <Animated.View style={[styles.bubble, { width: height * 0.72, height: height * 0.72, backgroundColor: bubble }, wobble]}>
        <Txt style={[styles.percent, { fontSize: height * 0.36, lineHeight: height * 0.42, color: iconColor }]}>%</Txt>
      </Animated.View>
    );
  }
  return (
    <View style={[styles.bubble, { width: height * 0.72, height: height * 0.72, backgroundColor: bubble }]}>
      <PartIcon name={b.art === 'cash' ? 'cash-multiple' : b.art === 'delivery' ? 'truck-fast' : 'car-cog'} size={height * 0.36} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, overflow: 'hidden' },
  circle: { position: 'absolute', borderRadius: 999, borderWidth: 18 },
  art: { position: 'absolute', right: 6, bottom: 4, top: 4, justifyContent: 'center', alignItems: 'flex-end' },
  copy: { flex: 1, width: '58%', padding: 18, justifyContent: 'center', gap: 6 },
  title: { fontFamily: fonts.display, letterSpacing: -0.5 },
  text: { marginTop: -2 },
  cta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, height: 34, borderRadius: radius.pill, marginTop: 4 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 10 },
  dot: { height: 7, borderRadius: 4, backgroundColor: colors.primary },
  bubble: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  percent: { fontFamily: fonts.displayHeavy },
});
