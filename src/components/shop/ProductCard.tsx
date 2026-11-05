import { memo } from 'react';
import { StyleSheet, View } from 'react-native';

import { discountPercent, LOW_STOCK, type Product } from '../../domain/products';
import { categoryLabel, modelBySlug } from '../../domain/taxonomy';
import { useT } from '../../i18n';
import { openProduct } from '../../lib/nav';
import { colors, radius, shadow } from '../../theme/tokens';
import { Pill } from '../ui/Controls';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { Skeleton } from '../ui/Skeleton';
import { Txt } from '../ui/Txt';
import { AddToCart } from './AddToCart';
import { FavButton } from './FavButton';
import { ProductImage } from './ProductImage';

export function modelsText(p: Product, lang: 'uz' | 'ru', max = 3): string {
  if (p.universal && !p.modellar.length) return lang === 'ru' ? 'Универсальный' : 'Universal';
  const names = p.modellar.map((s) => modelBySlug(s)?.name ?? s);
  if (!names.length) return p.model ?? categoryLabel(p.kategoriya, lang);
  return names.length > max ? `${names.slice(0, max).join(', ')} +${names.length - max}` : names.join(', ');
}

export const ProductCard = memo(function ProductCard({ product: p, width }: { product: Product; width: number }) {
  const { t, money, lang } = useT();
  const percent = discountPercent(p);
  const soldOut = p.qoldiq <= 0;
  const low = !soldOut && p.qoldiq <= LOW_STOCK;
  const unit = p.birlik ?? t('common.pcs');
  return (
    <View style={[styles.card, shadow.soft, { width }]}>
      <PressableScale onPress={() => openProduct(p.id)} scaleTo={0.97} accessibilityLabel={`${p.nomi}, ${money(p.narxi)}`}>
        <View>
          <ProductImage uri={p.rasmlar[0]} kategoriya={p.kategoriya} seed={p.id} style={styles.photo} />
          <View style={styles.badges} pointerEvents="none">
            {percent > 0 ? <Pill text={`−${percent}%`} tone="sale" /> : p.yangi ? <Pill text={lang === 'ru' ? 'Новинка' : 'Yangi'} tone="dark" /> : null}
          </View>
          {soldOut ? <View style={styles.soldOut} pointerEvents="none"><Txt variant="tiny" color={colors.white}>{t('product.soldOut')}</Txt></View> : null}
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
    </View>
  );
});

export function ProductCardSkeleton({ width }: { width: number }) {
  return (
    <View style={[styles.card, { width }]}>
      <Skeleton height={width} radius={0} />
      <View style={[styles.info, { gap: 8 }]}>
        <Skeleton width="60%" height={16} />
        <Skeleton width="90%" height={12} />
        <Skeleton width="70%" height={12} />
        <Skeleton height={34} radius={10} style={{ marginTop: 6 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.white, borderRadius: radius.lg, overflow: 'hidden' },
  photo: { aspectRatio: 1, width: '100%' },
  badges: { position: 'absolute', top: 8, left: 8, gap: 4 },
  soldOut: { position: 'absolute', bottom: 8, left: 8, backgroundColor: 'rgba(15,35,56,0.78)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
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
});
