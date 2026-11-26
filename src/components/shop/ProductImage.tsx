import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { categoryIcon } from '../../domain/taxonomy';
import { artTones, colors, fill } from '../../theme/tokens';
import { PartIcon } from '../ui/Icon';

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * Rasmi yo'q tovar uchun sokin o'rinbosar: kulrang kategoriya belgisi va neytral fon.
 * O'lcham (`size`) oldindan berilsa, ikonka birinchi kadrdayoq chiziladi — o'lchab, qayta chizib "pop" qilmaydi.
 */
export const ProductArt = memo(function ProductArt({ kategoriya, seed, iconScale = 0.3, size: fixed }: { kategoriya: string; seed: string; iconScale?: number; size?: number }) {
  const [measured, setMeasured] = useState(0);
  const size = fixed ?? measured;
  const tone = artTones[hash(seed) % artTones.length];
  return (
    <LinearGradient colors={tone} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}
      onLayout={fixed ? undefined : (e) => setMeasured(e.nativeEvent.layout.width)}>
      <View style={[styles.ring, { width: size * 0.9, height: size * 0.9, borderRadius: size, right: -size * 0.3, top: -size * 0.28 }]} />
      <View style={[styles.ring, styles.ring2, { width: size * 0.5, height: size * 0.5, borderRadius: size, left: -size * 0.16, bottom: -size * 0.12 }]} />
      <View style={styles.center}>
        {size > 0 ? <PartIcon name={categoryIcon(kategoriya)} size={size * iconScale} color={ART_ICON} /> : null}
      </View>
    </LinearGradient>
  );
});

/** `size` — rasm kengligi (ma'lum bo'lsa bering: rasmsiz tovar ikonkasi birdaniga to'g'ri chiziladi). */
export const ProductImage = memo(function ProductImage({ uri, kategoriya, seed, style, iconScale, contentFit = 'contain', size }: {
  uri?: string; kategoriya: string; seed: string; style?: StyleProp<ViewStyle>; iconScale?: number; contentFit?: 'contain' | 'cover'; size?: number;
}) {
  const [failedUri, setFailedUri] = useState<string | undefined>();
  return (
    <View style={[styles.box, style]}>
      {!uri || failedUri === uri ? (
        <ProductArt kategoriya={kategoriya} seed={seed} iconScale={iconScale} size={size} />
      ) : (
        // Qisqa, yumshoq paydo bo'lish. Telefon xotirasidagi (keshdagi) rasm qayta "o'chib-yonmaydi".
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit={contentFit} transition={160} recyclingKey={uri}
          cachePolicy="memory-disk" onError={() => setFailedUri(uri)} accessibilityIgnoresInvertColors />
      )}
    </View>
  );
});

/** Rasmsiz tovar belgisi — sokin kulrang (katta ko'k ikonka kartani arzon "shablon"ga o'xshatardi). */
const ART_ICON = '#A9B4C0';

const styles = StyleSheet.create({
  box: { backgroundColor: colors.white, overflow: 'hidden' },
  ring: { position: 'absolute', borderWidth: 14, borderColor: 'rgba(15,35,56,0.03)' },
  ring2: { borderWidth: 10, borderColor: 'rgba(15,35,56,0.025)' },
  center: { ...fill, alignItems: 'center', justifyContent: 'center' },
});
