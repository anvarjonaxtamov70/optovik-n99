import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Notice } from '../components/shop/CatalogBits';
import { modelsText } from '../components/shop/ProductCard';
import { ProductImage } from '../components/shop/ProductImage';
import { ProductRail } from '../components/shop/ProductRail';
import { useAboveTabBar, useTabBarSpace } from '../components/TabBar';
import { Button } from '../components/ui/Button';
import { Card, Checkbox } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { FLOATING_BAR_HEIGHT, FloatingBar } from '../components/ui/FloatingBar';
import { Icon } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { PressableScale } from '../components/ui/PressableScale';
import { Stepper } from '../components/ui/Stepper';
import { Txt } from '../components/ui/Txt';
import { cartSuggestions, MAX_QTY, type CartLine } from '../domain/cart';
import type { Product } from '../domain/products';
import { useT } from '../i18n';
import { confirmAsync } from '../lib/confirm';
import { haptic } from '../lib/haptics';
import { openProduct } from '../lib/nav';
import { cart, cartStore, useCart, useCartNotice } from '../state/cart';
import { useCatalogLive, useProducts, useSettings } from '../state/catalog';
import { prefs, useFavorites } from '../state/prefs';
import { showToast } from '../state/toast';
import { ease } from '../theme/motion';
import { colors, radius, shadow } from '../theme/tokens';

/** Ixcham taklif kartasining kengligi (avvalgi to'liq kartalardan ikki baravar past). */
const MINI_W = 128;

/**
 * Savat: asosiy e'tibor savatdagi tovarlarda. Takliflar pastda ixcham qatorda,
 * jami va «Rasmiylashtirish» pastki menyu ustida suzib turadi.
 */
export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { t, money } = useT();
  const { lines, summary } = useCart('olib');
  const notice = useCartNotice();
  const live = useCatalogLive();
  const settings = useSettings();
  const products = useProducts();
  const above = useAboveTabBar();
  const bottomSpace = useTabBarSpace(FLOATING_BAR_HEIGHT + 8);
  const emptySpace = useTabBarSpace();
  const available = lines.filter((l) => l.product && l.problem !== 'soldout' && l.problem !== 'missing');
  const unavailable = lines.filter((l) => !available.includes(l));
  const allSelected = available.length > 0 && available.every((l) => l.selected);
  const selectedIds = available.filter((l) => l.selected).map((l) => l.id);
  const suggestions = useMemo(() => cartSuggestions(products, lines, 10), [products, lines]);
  const fallback = useMemo(() => products.filter((p) => p.qoldiq > 0 && (p.ommabop || p.eskiNarx)).slice(0, 12), [products]);

  const removeWithUndo = (ids: string[]) => {
    const snapshot = Object.fromEntries(lines.filter((l) => ids.includes(l.id)).map((l) => [l.id, l.qty]));
    const off = ids.filter((id) => cartStore.get().off[id]);
    haptic.medium();
    cart.remove(ids);
    showToast(t('cart.removed'), { action: { label: t('cart.undo'), onPress: () => cart.restore(snapshot, off) } });
  };

  if (!lines.length) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.titleRow}><Txt variant="title">{t('cart.title')}</Txt></View>
        <ScrollView contentContainerStyle={{ paddingBottom: emptySpace }}>
          <EmptyState icon="cart-outline" title={t('cart.emptyTitle')} text={t('cart.emptyText')} action={{ label: t('cart.toCatalog'), onPress: () => router.navigate('/') }} />
          <ProductRail title={t('cart.recommend')} products={fallback} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.titleRow}>
        <Txt variant="title" style={styles.flex}>{t('cart.title')}</Txt>
        <Txt variant="small">{t('common.items', { n: summary.count })}</Txt>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: bottomSpace }]} showsVerticalScrollIndicator={false}>
        {notice ? <Notice icon="information-circle-outline" text={t(notice === 'removed' ? 'cart.removedMissing' : 'cart.adjusted')} action={t('common.close')} onAction={cart.dismissNotice} /> : null}
        {!live ? <Notice icon="cloud-offline-outline" text={t('cart.offline')} tone="warning" /> : null}

        {available.length ? (
          <View style={styles.selectRow}>
            {/* Bitta bosiladigan joy: ekran o'quvchida ham bir marta o'qiladi. */}
            <PressableScale onPress={() => cart.selectAll(!allSelected)} scaleTo={1} style={styles.selectAll} accessibilityRole="checkbox"
              accessibilityState={{ checked: allSelected }} accessibilityLabel={t('cart.selectAll')}>
              <Checkbox checked={allSelected} onPress={() => cart.selectAll(!allSelected)} label={t('cart.selectAll')} />
              <Txt variant="smallStrong">{t('cart.selectAll')}</Txt>
            </PressableScale>
            {selectedIds.length ? (
              <PressableScale onPress={() => void confirmAsync(t('cart.deleteSelected'), t('cart.removeAllConfirm'), { ok: t('common.delete'), cancel: t('common.cancel'), destructive: true })
                .then((ok) => { if (ok) removeWithUndo(selectedIds); })} hitSlop={6} style={styles.deleteSel} accessibilityLabel={t('cart.deleteSelected')}>
                <Icon name="trash-outline" size={16} color={colors.sale} />
                <Txt variant="smallStrong" color={colors.sale}>{t('common.delete')}</Txt>
              </PressableScale>
            ) : null}
          </View>
        ) : null}

        <View style={styles.lines}>
          {available.map((l) => <CartRow key={l.id} line={l} onRemove={() => removeWithUndo([l.id])} />)}
        </View>

        {unavailable.length ? (
          <View style={styles.lines}>
            <View style={styles.groupHead}>
              <Txt variant="smallStrong" color={colors.muted} style={styles.flex}>{t('cart.unavailable', { n: unavailable.length })}</Txt>
              <PressableScale onPress={() => removeWithUndo(unavailable.map((l) => l.id))} hitSlop={8} style={styles.deleteSel} accessibilityLabel={t('cart.clearUnavailable')}>
                <Txt variant="smallStrong" color={colors.primary}>{t('cart.clearUnavailable')}</Txt>
              </PressableScale>
            </View>
            {unavailable.map((l) => <CartRow key={l.id} line={l} onRemove={() => removeWithUndo([l.id])} />)}
          </View>
        ) : null}

        <Card style={styles.summary}>
          {settings.freeDeliveryFrom > 0 && settings.courierEnabled ? <FreeDelivery left={summary.freeLeft} total={settings.freeDeliveryFrom} /> : null}
          <Row label={t('cart.goods', { n: summary.count })} value={money(summary.oldTotal)} />
          {summary.savings > 0 ? <Row label={t('cart.discount')} value={`−${money(summary.savings)}`} tone={colors.success} /> : null}
          <View style={styles.hr} />
          <Row label={t('cart.total')} value={money(summary.subtotal)} strong />
        </Card>

        {suggestions.length ? <Suggestions products={suggestions} /> : null}
      </ScrollView>

      <FloatingBar bottom={above}>
        <View style={styles.flex}>
          <Txt variant="tiny" numberOfLines={1}>{summary.count ? t('common.items', { n: summary.count }) : t('cart.nothingSelected')}</Txt>
          <Txt variant="h3" numberOfLines={1} adjustsFontSizeToFit>{money(summary.subtotal)}</Txt>
        </View>
        <Button title={t('cart.checkout')} iconRight="arrow-forward" full={false} style={styles.checkoutBtn} disabled={!summary.lines || !live} onPress={() => router.push('/checkout')} />
      </FloatingBar>
    </View>
  );
}

function CartRow({ line: l, onRemove }: { line: CartLine; onRemove: () => void }) {
  const { t, money, lang } = useT();
  const favs = useFavorites();
  const p = l.product;
  const fav = favs.includes(l.id);
  const sellable = !!p && l.problem !== 'soldout' && l.problem !== 'missing';
  return (
    // Kirish animatsiyasi yo'q; o'chirilganda yumshoq yo'qoladi va qolganlari silliq yuqoriga suriladi.
    <Animated.View exiting={FadeOut.duration(160)} layout={LinearTransition.duration(220)}
      style={[styles.row, shadow.soft, !l.selected && sellable && styles.rowOff, !sellable && styles.rowGone]}>
      <View style={styles.rowTop}>
        {/* Sotuvda yo'q tovarni tanlab bo'lmaydi — "o'lik" belgi qo'yilmaydi. */}
        {sellable ? <Checkbox checked={l.selected} onPress={() => cart.toggle(l.id)} label={p?.nomi ?? l.id} /> : <View style={styles.checkSpace} />}
        <PressableScale onPress={() => p && openProduct(p.id)} disabled={!p} scaleTo={0.94} accessibilityLabel={p?.nomi ?? t('cart.missing')}>
          <ProductImage uri={p?.rasmlar[0]} kategoriya={p?.kategoriya ?? l.id.split('/')[0]} seed={l.id} style={styles.thumb} iconScale={0.42} size={84} />
        </PressableScale>
        <View style={styles.info}>
          <Txt variant="smallStrong" numberOfLines={2}>{p?.nomi ?? t('cart.missing')}</Txt>
          {p ? <Txt variant="tiny" numberOfLines={1}>{modelsText(p, lang)}</Txt> : null}
          {p ? (
            <View style={styles.priceLine}>
              <Txt variant="bodyStrong">{money(p.narxi)}</Txt>
              {p.eskiNarx ? <Txt variant="tiny" color={colors.faint} style={styles.strike}>{money(p.eskiNarx)}</Txt> : null}
            </View>
          ) : null}
        </View>
      </View>
      {l.problem ? (
        <View style={styles.problem}>
          <Icon name="alert-circle" size={16} color={colors.warning} />
          <Txt variant="tiny" color={colors.warning} style={styles.flex}>
            {l.problem === 'missing' ? t('cart.missing') : l.problem === 'soldout' ? t('cart.soldout') : t('cart.reduced', { n: p?.qoldiq ?? 0 })}
          </Txt>
        </View>
      ) : null}
      <View style={styles.rowBottom}>
        {p ? <IconButton icon={fav ? 'heart' : 'heart-outline'} color={fav ? colors.sale : colors.muted} label={t('cart.toFavorites')} onPress={() => { prefs.toggleFavorite(l.id); haptic.tap(); }} size={44} bg={colors.surfaceAlt} /> : null}
        <IconButton icon="trash-outline" color={colors.muted} label={t('common.delete')} onPress={onRemove} size={44} bg={colors.surfaceAlt} />
        <View style={styles.flex} />
        {sellable && p ? (
          <View style={styles.stepper}>
            <Stepper value={Math.min(l.qty, p.qoldiq)} max={Math.min(p.qoldiq, MAX_QTY)} labelInc={`${p.nomi}: +1`} labelDec={`${p.nomi}: −1`}
              trashAtOne={false} onInc={() => cart.inc(p)} onDec={() => { if (l.qty > 1) cart.dec(p); }} />
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** Ixcham takliflar: rasm, nom, narx va «+» — bosilsa tovar darhol savatga tushadi. */
function Suggestions({ products }: { products: Product[] }) {
  const { t } = useT();
  return (
    <View style={styles.suggest}>
      <Txt variant="h3" style={styles.suggestTitle}>{t('cart.recommendShort')}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestRow}>
        {products.map((p) => <MiniCard key={p.id} product={p} />)}
      </ScrollView>
    </View>
  );
}

function MiniCard({ product: p }: { product: Product }) {
  const { t, money } = useT();
  return (
    <View style={[styles.mini, shadow.soft]}>
      <PressableScale onPress={() => openProduct(p.id)} scaleTo={0.97} unstable_pressDelay={110} accessibilityLabel={`${p.nomi}, ${money(p.narxi)}`}>
        <View style={styles.miniPhoto}>
          <ProductImage uri={p.rasmlar[0]} kategoriya={p.kategoriya} seed={p.id} style={styles.miniImg} iconScale={0.36} size={MINI_W} />
        </View>
        <View style={styles.miniInfo}>
          <Txt variant="tiny" color={colors.ink} numberOfLines={2} style={styles.miniName}>{p.nomi}</Txt>
          <Txt variant="smallStrong" numberOfLines={1} style={styles.miniPrice}>{money(p.narxi)}</Txt>
        </View>
      </PressableScale>
      <IconButton icon="add" iconSize={20} label={`${p.nomi}: ${t('product.add')}`} size={36} tone="primary" bg={colors.primary} color={colors.white}
        style={styles.miniAdd} onPress={() => { haptic.light(); cart.add(p); showToast(t('product.added'), { kind: 'success', icon: 'cart' }); }} />
    </View>
  );
}

function FreeDelivery({ left, total }: { left: number; total: number }) {
  const { t, money } = useT();
  const progress = useSharedValue(0);
  const ratio = Math.max(0, Math.min(1, 1 - left / total));
  useEffect(() => { progress.set(withTiming(ratio, { duration: 700, easing: ease.out })); }, [ratio, progress]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View style={styles.free}>
      <View style={styles.freeHead}>
        <Icon name={left ? 'bicycle-outline' : 'gift-outline'} size={16} color={left ? colors.primary : colors.success} />
        <Txt variant="tiny" color={left ? colors.text : colors.success} style={styles.flex}>{left ? t('cart.freeLeft', { sum: money(left) }) : t('cart.freeReached')}</Txt>
      </View>
      <View style={styles.track}><Animated.View style={[styles.fill, { backgroundColor: left ? colors.primary : colors.success }, bar]} /></View>
    </View>
  );
}

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <View style={styles.sumRow}>
      <Txt variant={strong ? 'h3' : 'body'} style={styles.flex}>{label}</Txt>
      <Txt variant={strong ? 'h3' : 'bodyStrong'} color={tone}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
  body: { padding: 16, paddingTop: 8, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4 },
  selectAll: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  deleteSel: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, minHeight: 44 },
  lines: { gap: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, marginTop: 4 },
  row: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, gap: 10 },
  rowOff: { opacity: 0.72 },
  rowGone: { opacity: 0.6 },
  rowTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  checkSpace: { width: 24 },
  thumb: { width: 84, height: 84, borderRadius: radius.md },
  info: { flex: 1, gap: 3 },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2, flexWrap: 'wrap' },
  strike: { textDecorationLine: 'line-through' },
  problem: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: radius.sm, backgroundColor: colors.warningSoft },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepper: { width: 138 },
  summary: { gap: 10 },
  sumRow: { flexDirection: 'row', alignItems: 'center' },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  free: { gap: 8, paddingBottom: 4 },
  freeHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  track: { height: 5, borderRadius: 3, backgroundColor: colors.tint, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  suggest: { gap: 10, marginTop: 4 },
  suggestTitle: { paddingHorizontal: 4 },
  // Soyalar kesilmasligi uchun vertikal bo'shliq; ro'yxat chetigacha suriladi.
  suggestRow: { gap: 10, paddingVertical: 4, paddingRight: 4 },
  mini: { width: MINI_W, backgroundColor: colors.white, borderRadius: radius.md },
  miniPhoto: { borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, overflow: 'hidden' },
  miniImg: { width: MINI_W, height: 92 },
  miniInfo: { paddingHorizontal: 9, paddingTop: 7, paddingBottom: 10, gap: 3 },
  miniName: { minHeight: 30 },
  miniPrice: { fontSize: 13 },
  miniAdd: { position: 'absolute', right: 6, top: 6 },
  checkoutBtn: { minWidth: 172 },
});
