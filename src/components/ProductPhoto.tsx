import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import type { Product } from '../store/shop';
import { colors } from '../theme';
import { Icon } from './Icon';

export function ProductPhoto({ product, large = false }: { product: Product; large?: boolean }) {
  const [failedUri, setFailedUri] = useState<string>();
  return <View style={[styles.photo, large && styles.large]}>
    {product.rasm && failedUri !== product.rasm ? <Image source={{ uri: product.rasm }} accessibilityLabel={product.nomi} resizeMode={large ? 'contain' : 'cover'}
      onError={() => setFailedUri(product.rasm)} style={StyleSheet.absoluteFill} /> :
      <View style={styles.placeholder}><Icon name="box" size={large ? 60 : 36} color={colors.muted} /><Text style={styles.caption}>Rasm qo‘shilmagan</Text></View>}
  </View>;
}
const styles = StyleSheet.create({
  photo: { width: '100%', aspectRatio: 1, backgroundColor: colors.photo, alignItems: 'center', justifyContent: 'center' },
  large: { aspectRatio: undefined, height: 290, borderRadius: 20, overflow: 'hidden' },
  placeholder: { alignItems: 'center', gap: 10, padding: 12 },
  caption: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
