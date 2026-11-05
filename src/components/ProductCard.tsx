import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { discountPercent } from '../store/catalog';
import { useShop } from '../store/ShopProvider';
import { categoryLabel, formatMoney, type Product } from '../store/shop';
import { colors, shadows, ui } from '../theme';
import { Icon } from './Icon';
import { ProductPhoto } from './ProductPhoto';

export const ProductCard = memo(function ProductCard({ product, width }: { product: Product; width?: number }) {
  const { state, dispatch, favorites, toggleFavorite, compareIds, toggleCompare } = useShop();
  const qty = state.quantities[product.id] ?? 0;
  const saved = favorites.includes(product.id);
  const compared = compareIds.includes(product.id);
  const compareFull = !compared && compareIds.length >= 2;
  const percent = discountPercent(product);
  const soldOut = product.qoldiq <= 0;
  const limit = qty >= Math.min(product.qoldiq, 999);
  const disabled = state.status !== 'ready' || soldOut || limit;
  const [category, id] = product.id.split('/');
  const openProduct = () => router.push({ pathname: '/product/[category]/[id]', params: { category, id } });
  const buttonLabel = soldOut ? 'Tugagan' : qty ? `Savatda (${qty})` : 'Savatga';
  return <View style={[styles.shadow, shadows.card, width !== undefined ? { width } : styles.flex]}>
    <View style={styles.card}>
      <View>
        <Pressable accessibilityRole="button" accessibilityLabel={product.nomi + ' haqida'} onPress={openProduct}>
          <ProductPhoto product={product} />
        </Pressable>
        <Pressable onPress={() => toggleCompare(product.id)} disabled={compareFull} accessibilityRole="button"
          accessibilityLabel={compared ? `${product.nomi}: taqqoslashdan olib tashlash` : compareFull ? 'Taqqoslash uchun ikkita mahsulot tanlangan' : `${product.nomi}: taqqoslashga qo‘shish`}
          accessibilityState={{ selected: compared, disabled: compareFull }} style={({ pressed }) => [styles.roundButton, styles.compare, shadows.small, compared && styles.selected, compareFull && styles.dim, pressed && ui.pressed]}>
          <Icon name="scale" size={20} />
        </Pressable>
        <Pressable onPress={() => toggleFavorite(product.id)} accessibilityRole="button" accessibilityLabel={saved ? `${product.nomi}: sevimlilardan olib tashlash` : `${product.nomi}: sevimlilarga qo‘shish`}
          accessibilityState={{ selected: saved }} style={({ pressed }) => [styles.roundButton, styles.heart, shadows.small, pressed && ui.pressed]}>
          <Icon name="heart" size={21} filled={saved} color={saved ? colors.sale : colors.text} />
        </Pressable>
        {percent > 0 && <View style={styles.discount}><Text style={styles.discountText}>−{percent}%</Text></View>}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={product.nomi + ', ' + formatMoney(product.narxi)} onPress={openProduct} style={styles.info}>
        <Text numberOfLines={2} style={styles.name}>{product.nomi}</Text>
        <Text numberOfLines={1} style={styles.model}>{product.model || categoryLabel(product.kategoriya)}</Text>
        <Text style={styles.stock}>{soldOut ? 'Hozircha qolmagan' : 'Mavjud'}</Text>
        <View style={styles.prices}>
          <Text style={styles.price}>{formatMoney(product.narxi)}</Text>
          {!!product.eskiNarx && product.eskiNarx > product.narxi && <Text style={styles.oldPrice}>{formatMoney(product.eskiNarx)}</Text>}
        </View>
      </Pressable>
      <View style={styles.action}>
        <Pressable onPress={() => dispatch({ type: 'quantity', id: product.id, delta: 1 })} disabled={disabled} accessibilityRole="button"
          accessibilityLabel={soldOut ? `${product.nomi}: tugagan` : limit ? `${product.nomi}: mavjud qoldiq savatda` : qty ? `${product.nomi}: savatda ${qty} dona, yana bitta qo‘shish` : `${product.nomi}: savatga qo‘shish`}
          accessibilityState={{ disabled }} style={({ pressed }) => [styles.buy, !disabled && shadows.button, pressed && styles.pressed]}>
          <LinearGradient colors={disabled ? [colors.disabled, colors.disabled] : ['#99e1ff', '#67c8f5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.buyFill}>
            <Icon name={qty ? 'check' : 'bag'} size={19} /><Text style={styles.buyText}>{buttonLabel}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </View>
  </View>;
});
const styles = StyleSheet.create({
  shadow: { borderRadius: 20, backgroundColor: colors.white },
  flex: { flex: 1, maxWidth: '50%' },
  card: { flex: 1, borderRadius: 20, overflow: 'hidden', backgroundColor: colors.white },
  roundButton: { position: 'absolute', top: 6, width: 48, height: 48, borderRadius: 24, backgroundColor: '#fffffff0', alignItems: 'center', justifyContent: 'center' },
  compare: { left: 6 }, heart: { right: 6 }, selected: { backgroundColor: colors.blue }, dim: { opacity: 0.45 },
  discount: { position: 'absolute', top: 60, left: 8, borderRadius: 7, backgroundColor: colors.sale, paddingHorizontal: 7, paddingVertical: 4 },
  discountText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  info: { padding: 11, paddingBottom: 4, gap: 5, flex: 1 },
  name: { fontSize: 15, lineHeight: 20, minHeight: 40, fontWeight: '700', color: colors.text },
  model: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  stock: { color: colors.text, fontSize: 12, lineHeight: 18 },
  prices: { marginTop: 'auto', paddingTop: 3, minHeight: 51, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6, rowGap: 2 },
  price: { fontSize: 17, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  oldPrice: { fontSize: 11, color: colors.muted, textDecorationLine: 'line-through' },
  action: { padding: 11, paddingTop: 8 },
  buy: { borderRadius: 12, backgroundColor: colors.blue },
  buyFill: { minHeight: 48, padding: 8, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  buyText: { color: colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
});
