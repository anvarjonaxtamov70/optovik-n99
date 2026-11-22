import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useSharedValue } from 'react-native-reanimated';

import { discountPercent, LOW_STOCK, type Product } from '../../domain/products';
import { categoryLabel, modelBySlug } from '../../domain/taxonomy';
import { translate, useT } from '../../i18n';
import { openProduct } from '../../lib/nav';
import { colors, radius, shadow } from '../../theme/tokens';
import { Pill } from '../ui/Controls';
import { Icon } from '../ui/Icon';
import { PressableScale, usePressStyle } from '../ui/PressableScale';
import { Skeleton } from '../ui/Skeleton';
import { Txt } from '../ui/Txt';
import { AddToCart } from './AddToCart';
import { FavButton } from './FavButton';
import { ProductImage } from './ProductImage';

export function modelsText(p: Product, lang: 'uz' | 'ru', max = 3): string {
  if (p.universal && !p.modellar.length) return translate(lang, 'product.universalShort');
  const names = p.modellar.map((s) => modelBySlug(s)?.name ?? s);
  if (!names.length) return p.model ?? categoryLabel(p.kategoriya, lang);
  return names.length > max ? `${names.slice(0, max).join(', ')} +${names.length - max}` : names.join(', ');
}

/**
 * Tovar kartasi. Rasm yoki nom bosilganda butun karta (soyasi bilan) bitta buyumdek siqiladi.
 * Yurakcha va «Savatga» o'z bosilishiga ega — ular bosilganda karta siqilmaydi.
 */
export const ProductCard = memo(function ProductCard({ product: p, width }: { product: Product; width: number }) {
  const { t, money, lang } = useT();
  const pressed = useSharedValue(0);
  const lift = usePressStyle(pressed, 0.975);
  const percent = discountPercent(p);
  const soldOut = p.qoldiq <= 0;
  const low = !soldOut && p.qoldiq <= LOW_STOCK;
  const unit = p.birlik ?? t('common.pcs');
  return (
    <Animated.View style={[styles.card, shadow.soft, { width }, lift]}>
      <PressableScale onPress={() => openProduct(p.id)} progress={pressed} accessibilityLabel={`${p.nomi}, ${money(p.narxi)}`}>
        <View style={styles.photoClip}>
          <ProductImage uri={p.rasmlar[0]} kategoriya={p.kategoriya} seed={p.id} style={styles.photo} size={width} />
          <View style={styles.badges}>
            {percent > 0 ? <Pill text={`−${percent}%`} tone="sale" /> : p.yangi ? <Pill text={t('product.newBadge')} tone="dark" /> : null}
          </View>
          {soldOut ? <View style={styles.soldOut}><Txt variant="tiny" color={colors.white}>{t('product.soldOut')}</Txt></View> : null}
        </View>
        <View style={styles.info}>
          <View style={styles.priceRow}>
            <Txt variant="price" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} color={percent ? colors.sale : colors.ink}>{money(p.narxi)}</Txt>
          </View>
          {p.eskiNarx ? <Txt variant="tiny" color={colors.faint} style={styles.old} numberOfLines={1}>{money(p.eskiNarx)}</Txt> : <View style={styles.oldSpacer} />}
          <Txt variant="small" color={colors.ink} numberOfLines={2} style={styles.name}>{p.nomi}</Txt>
          <View style={styles.meta}>
            <Icon name="car-sport-outline" size={13} color={colors.faint} />
            <Txt variant="tiny" numberOfLines={1} style={styles.flex}>{modelsText(p, lang)}</Txt>
          </View>
          {low ? <Txt variant="tiny" color={colors.warning} numberOfLines={1}>{t('product.lowStock', { n: p.qoldiq, unit })}</Txt> : <View style={styles.lowSpacer} />}
        </View>
      </PressableScale>
      <View style={styles.fav}><FavButton id={p.id} name={p.nomi} /></View>
      <View style={styles.action}><AddToCart product={p} /></View>
    </Animated.View>
  );
});

export function ProductCardSkeleton({ width }: { width: number }) {
  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.photoClip}><Skeleton height={width} radius={0} /></View>
      <View style={[styles.info, styles.skeletonInfo]}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="90%" height={12} />
        <Skeleton width="70%" height={12} />
        <Skeleton height={44} radius={radius.sm} style={styles.skeletonBtn} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Tashqi qobiq: oq fon va soya (soya kesilmasligi uchun bu yerda `overflow: hidden` yo'q).
  card: { backgroundColor: colors.white, borderRadius: radius.lg },
  // Rasm burchaklari shu yerda kesiladi.
  photoClip: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: 'hidden' },
  photo: { aspectRatio: 1, width: '100%' },
  badges: { position: 'absolute', top: 8, left: 8, gap: 4, pointerEvents: 'none' },
  soldOut: { position: 'absolute', bottom: 8, left: 8, backgroundColor: colors.scrim, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, pointerEvents: 'none' },
  fav: { position: 'absolute', top: 6, right: 6 },
  info: { paddingHorizontal: 10, paddingTop: 9, gap: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline' },
  old: { textDecorationLine: 'line-through', marginTop: -2 },
  oldSpacer: { height: 13 },
  name: { minHeight: 36, marginTop: 2 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  flex: { flex: 1 },
  lowSpacer: { height: 15 },
  action: { padding: 10, paddingTop: 6 },
  skeletonInfo: { gap: 8, paddingBottom: 10 },
  skeletonBtn: { marginTop: 6 },
});
