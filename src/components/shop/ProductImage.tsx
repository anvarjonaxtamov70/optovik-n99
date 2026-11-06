import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { categoryIcon } from '../../domain/taxonomy';
import { colors, fill } from '../../theme/tokens';
import { PartIcon } from '../ui/Icon';

const TONES: [string, string][] = [
  ['#EEF6FD', '#DCEBF8'], ['#F1F5FB', '#E1E9F4'], ['#EDF7F7', '#D9EDF0'], ['#F3F2FB', '#E3E2F4'],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Rasmi yo'q tovar uchun chiroyli o'rinbosar: kategoriya ikonkasi, yumshoq fon va g'ildirak naqshi. */
export const ProductArt = memo(function ProductArt({ kategoriya, seed, iconScale = 0.36 }: { kategoriya: string; seed: string; iconScale?: number }) {
  const [size, setSize] = useState(0);
  const tone = TONES[hash(seed) % TONES.length];
  return (
    <LinearGradient colors={tone} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} onLayout={(e) => setSize(e.nativeEvent.layout.width)}>
      <View style={[styles.ring, { width: size * 0.9, height: size * 0.9, borderRadius: size, right: -size * 0.3, top: -size * 0.28 }]} />
      <View style={[styles.ring, styles.ring2, { width: size * 0.5, height: size * 0.5, borderRadius: size, left: -size * 0.16, bottom: -size * 0.12 }]} />
      <View style={styles.center}>
        {size > 0 ? <PartIcon name={categoryIcon(kategoriya)} size={size * iconScale} color={colors.primary} /> : null}
      </View>
    </LinearGradient>
  );
});

export const ProductImage = memo(function ProductImage({ uri, kategoriya, seed, style, iconScale, contentFit = 'contain' }: {
  uri?: string; kategoriya: string; seed: string; style?: StyleProp<ViewStyle>; iconScale?: number; contentFit?: 'contain' | 'cover';
}) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.box, style]}>
      {!uri || failed ? (
        <ProductArt kategoriya={kategoriya} seed={seed} iconScale={iconScale} />
      ) : (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit={contentFit} transition={220} recyclingKey={uri}
          cachePolicy="memory-disk" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { backgroundColor: colors.white, overflow: 'hidden' },
  ring: { position: 'absolute', borderWidth: 14, borderColor: 'rgba(33,115,177,0.06)' },
  ring2: { borderWidth: 10, borderColor: 'rgba(33,115,177,0.05)' },
  center: { ...fill, alignItems: 'center', justifyContent: 'center' },
});
