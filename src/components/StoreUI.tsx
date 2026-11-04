import { router } from 'expo-router';
import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { useShop } from '../store/ShopProvider';
import { categoryLabel, formatMoney, type Product } from '../store/shop';
import { colors, ui } from '../theme';
import { ActionButton } from './ShopUI';

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}><Text style={styles.label}>{label}</Text><TextInput {...props} accessibilityLabel={label}
    placeholderTextColor={colors.muted} style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]} /></View>;
}
export function Message({ text }: { text: string }) {
  return text ? <Text accessibilityLiveRegion="polite" style={styles.message}>{text}</Text> : null;
}
export function Pill({ text, selected, onPress }: { text: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.pill, selected && styles.selected]}>
    <Text style={{ color: selected ? colors.white : colors.text, fontWeight: '600' }}>{text}</Text>
  </Pressable>;
}
export function ProductPhoto({ product, large = false }: { product: Product; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  return <View style={[styles.photo, large && { height: 290 }]}>
    {product.rasm && !failed ? <Image source={{ uri: product.rasm }} accessibilityLabel={product.nomi} resizeMode="contain" onError={() => setFailed(true)} style={{ width: '100%', height: '100%' }} /> :
      <View style={{ alignItems: 'center', gap: 8 }}><Text style={{ fontSize: large ? 60 : 38, color: colors.accent }}>⚙</Text><Text style={ui.category}>Rasm qo‘shilmagan</Text></View>}
  </View>;
}
export const ProductCard = memo(function ProductCard({ product }: { product: Product }) {
  const { state, dispatch, favorites, toggleFavorite } = useShop();
  const qty = state.quantities[product.id] ?? 0;
  const saved = favorites.includes(product.id);
  const [category, id] = product.id.split('/');
  return <View style={styles.product}>
    <Pressable accessibilityRole="button" accessibilityLabel={product.nomi + ' haqida'} onPress={() => router.push({ pathname: '/product/[category]/[id]', params: { category, id } })}>
      <ProductPhoto key={product.rasm} product={product} />
      <View style={{ padding: 12, gap: 6 }}>
        <Text style={ui.category}>{product.model || categoryLabel(product.kategoriya)}</Text>
        <Text numberOfLines={2} style={styles.productName}>{product.nomi}</Text>
        {product.eskiNarx ? <Text style={{ color: colors.muted, textDecorationLine: 'line-through' }}>{formatMoney(product.eskiNarx)}</Text> : null}
        <Text style={styles.productPrice}>{formatMoney(product.narxi)}</Text>
        <Text style={ui.category}>{product.qoldiq > 0 ? product.qoldiq + ' dona mavjud' : 'Hozircha qolmagan'}</Text>
      </View>
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={saved ? 'Sevimlilardan olib tashlash' : 'Sevimlilarga qo‘shish'} accessibilityState={{ selected: saved }} onPress={() => toggleFavorite(product.id)} style={styles.heart}>
      <Text style={{ fontSize: 25, color: colors.accent }}>{saved ? '♥' : '♡'}</Text>
    </Pressable>
    <View style={{ paddingHorizontal: 10, paddingBottom: 10, marginTop: 'auto' }}>
      <ActionButton label={qty ? 'Savatda ' + qty + '  +' : 'Savatga +'} disabled={state.status !== 'ready' || qty >= Math.min(product.qoldiq, 999)}
        onPress={() => dispatch({ type: 'quantity', id: product.id, delta: 1 })} />
    </View>
  </View>;
});
const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, minHeight: 50, color: colors.text, fontSize: 16 },
  message: { backgroundColor: colors.warning, padding: 14, borderRadius: 14, color: colors.text, fontSize: 14, lineHeight: 21 },
  pill: { paddingHorizontal: 15, paddingVertical: 12, minHeight: 44, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  selected: { backgroundColor: colors.accent, borderColor: colors.accent },
  photo: { height: 155, padding: 12, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center', borderRadius: 18 },
  product: { flex: 1, maxWidth: '50%', backgroundColor: colors.white, borderRadius: 22, borderColor: colors.border, borderWidth: 1, overflow: 'hidden', gap: 8 },
  productName: { fontSize: 16, lineHeight: 22, minHeight: 44, fontWeight: '700', color: colors.text },
  productPrice: { fontSize: 18, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  heart: { position: 'absolute', right: 6, top: 6, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
