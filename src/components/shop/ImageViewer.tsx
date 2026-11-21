import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useT } from '../../i18n';
import { colors, radius } from '../../theme/tokens';
import { IconButton } from '../ui/IconButton';
import { Txt } from '../ui/Txt';

const MAX_SCALE = 4;
const TAP_SCALE = 2.5;
const spring = { damping: 20, stiffness: 220, mass: 0.6 };

/**
 * Rasmni to'liq ekranda ko'rish: barmoq bilan kattalashtirish (pinch), ikki marta bosish,
 * kattalashganda surish, rasmlar orasida varaqlash. Fonga bosilsa yopiladi.
 */
export function ImageViewer({ images, index, onClose }: { images: string[]; index: number; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const [page, setPage] = useState(index);
  const [zoomed, setZoomed] = useState(false);
  const scroll = useRef<Animated.ScrollView>(null);

  // Modal ochilganda bosilgan rasmdan boshlanadi.
  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollTo({ x: index * width, animated: false }), 0);
    return () => clearTimeout(id);
  }, [index, width]);

  return (
    <Modal visible transparent statusBarTranslucent navigationBarTranslucent animationType="fade" onRequestClose={onClose}>
      {/* Fon o'lchami aniq beriladi: brauzerda `flex: 1` modal ichida yig'ilib qolishi mumkin. */}
      <GestureHandlerRootView style={[styles.root, { width, height }]}>
        <Animated.ScrollView
          ref={scroll}
          testID="viewer-scroll"
          horizontal
          pagingEnabled
          scrollEnabled={!zoomed && images.length > 1}
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={64}
          // Hisoblagich har ikki muhitda ishlashi uchun: web'da "momentum" hodisasi bo'lmaydi.
          onScroll={(e) => {
            const next = Math.round(e.nativeEvent.contentOffset.x / width);
            setPage((prev) => (next !== prev && next >= 0 && next < images.length ? next : prev));
          }}
        >
          {images.map((uri, i) => (
            <ZoomableImage key={uri} uri={uri} width={width} height={height} onZoom={setZoomed} onClose={onClose}
              label={t('product.imageOf', { n: i + 1, total: images.length })} />
          ))}
        </Animated.ScrollView>

        <View style={[styles.bar, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
          {images.length > 1 ? (
            <View style={styles.counter}>
              <Txt variant="smallStrong" color={colors.white}>{page + 1} / {images.length}</Txt>
            </View>
          ) : <View />}
          <IconButton icon="close" label={t('common.close')} onPress={onClose} size={44} bg={colors.onBrandGlass} color={colors.white} />
        </View>
        <View style={[styles.hint, { paddingBottom: insets.bottom + 16 }]} pointerEvents="none">
          <Txt variant="tiny" color={colors.onBrandMuted} center>{t('product.zoomHint')}</Txt>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

function ZoomableImage({ uri, width, height, onZoom, onClose, label }: {
  uri: string; width: number; height: number; onZoom: (v: boolean) => void; onClose: () => void; label: string;
}) {
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withSpring(1, spring);
    saved.value = 1;
    x.value = withSpring(0, spring);
    y.value = withSpring(0, spring);
    scheduleOnRN(onZoom, false);
  };
  // Kattalashganda rasm chetidan nariga surilib ketmaydi.
  const clamp = () => {
    'worklet';
    const limitX = (width * (scale.value - 1)) / 2 / scale.value;
    const limitY = (height * (scale.value - 1)) / 2 / scale.value;
    x.value = withSpring(Math.min(limitX, Math.max(-limitX, x.value)), spring);
    y.value = withSpring(Math.min(limitY, Math.max(-limitY, y.value)), spring);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => { scale.value = Math.min(MAX_SCALE, Math.max(0.6, saved.value * e.scale)); })
    .onEnd(() => {
      if (scale.value <= 1.02) { reset(); return; }
      saved.value = scale.value;
      clamp();
      scheduleOnRN(onZoom, true);
    });

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => { startX.value = x.value; startY.value = y.value; })
    .onUpdate((e) => {
      if (saved.value <= 1) return;
      x.value = startX.value + e.translationX / saved.value;
      y.value = startY.value + e.translationY / saved.value;
    })
    .onEnd(() => { if (saved.value > 1) clamp(); });

  const doubleTap = Gesture.Tap().numberOfTaps(2).maxDuration(260)
    .onEnd(() => {
      if (saved.value > 1) { reset(); return; }
      scale.value = withSpring(TAP_SCALE, spring);
      saved.value = TAP_SCALE;
      scheduleOnRN(onZoom, true);
    });

  const singleTap = Gesture.Tap().numberOfTaps(1).maxDuration(260)
    .onEnd(() => {
      if (saved.value > 1) { reset(); return; }
      scale.value = withTiming(0.92, { duration: 120 });
      scheduleOnRN(onClose);
    });

  const gesture = Gesture.Exclusive(doubleTap, singleTap, Gesture.Simultaneous(pinch, pan));
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }, { translateX: x.value }, { translateY: y.value }] }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={{ width, height }}>
        <Animated.View style={[styles.fill, style]}>
          <Image source={{ uri }} style={styles.fill} contentFit="contain" transition={160} accessibilityLabel={label} accessibilityIgnoresInvertColors />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.viewerBg },
  fill: { width: '100%', height: '100%' },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  counter: { paddingHorizontal: 12, height: 32, borderRadius: radius.pill, backgroundColor: colors.onBrandGlass, alignItems: 'center', justifyContent: 'center' },
  hint: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 24 },
});
