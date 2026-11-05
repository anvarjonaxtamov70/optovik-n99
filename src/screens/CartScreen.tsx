import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { modelsText } from '../components/shop/ProductCard';
import { ProductImage } from '../components/shop/ProductImage';
import { ProductRail } from '../components/shop/ProductRail';
import { Notice } from '../components/shop/CatalogBits';
import { Button } from '../components/ui/Button';
import { Card, Checkbox } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { Icon } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { PressableScale } from '../components/ui/PressableScale';
import { Stepper } from '../components/ui/Stepper';
import { Txt } from '../components/ui/Txt';
import { MAX_QTY, type CartLine } from '../domain/cart';
import { useT } from '../i18n';
import { haptic } from '../lib/haptics';
import { openProduct } from '../lib/nav';
import { cart, useCart, useCartNotice } from '../state/cart';
import { useCatalogLive, useProducts, useSettings } from '../state/catalog';
import { prefs, useFavorites } from '../state/prefs';
import { showToast } from '../state/toast';
import { ease } from '../theme/motion';
import { colors, radius, shadow } from '../theme/tokens';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const { t, money } = useT();
  const { lines, summary } = useCart('olib');
  const notice = useCartNotice();
  const live = useCatalogLive();
  const settings = useSettings();
  const products = useProducts();
  const selectable = lines.filter((l) => l.product && l.problem !== 'soldout');
  const allSelected = selectable.length > 0 && selectable.every((l) => l.selected);
  const selectedIds = lines.filter((l) => l.selected).map((l) => l.id);
  const inCart = useMemo(() => new Set(lines.map((l) => l.id)), [lines]);
  const recommend = useMemo(() => products.filter((p) => p.qoldiq > 0 && !inCart.has(p.id) && (p.ommabop || p.eskiNarx)).slice(0, 12), [products, inCart]);

  const removeWithUndo = (ids: string[]) => {
    const snapshot = Object.fromEntries(lines.filter((l) => ids.includes(l.id)).map((l) => [l.id, l.qty]));
    haptic.medium();
    cart.remove(ids);
    showToast(t('cart.removed'), { action: { label: t('cart.undo'), onPress: () => cart.restore(snapshot) } });
  };

  if (!lines.length) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.titleRow}><Txt variant="title">{t('cart.title')}</Txt></View>
        <ScrollView contentContainerStyle={styles.emptyBody}>
          <EmptyState icon="cart-outline" title={t('cart.emptyTitle')} text={t('cart.emptyText')} action={{ label: t('cart.toCatalog'), onPress: () => router.navigate('/') }} />
          <ProductRail title={t('cart.recommend')} products={recommend} />
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
      <View style={styles.toolbar}>
        <Checkbox checked={allSelected} onPress={() => cart.selectAll(!allSelected)} label={t('cart.selectAll')} />
        <PressableScale onPress={() => cart.selectAll(!allSelected)} style={styles.flex} accessibilityLabel={t('cart.selectAll')}>
          <Txt variant="bodyStrong">{t('cart.selectAll')}</Txt>
        </PressableScale>
        {selectedIds.length ? (
          <PressableScale onPress={() => Alert.alert(t('cart.deleteSelected'), t('cart.removeAllConfirm'), [
            { text: t('common.cancel'), style: 'cancel' }, { text: t('common.delete'), style: 'destructive', onPress: () => removeWithUndo(selectedIds) },
          ])} style={styles.deleteSel} accessibilityLabel={t('cart.deleteSelected')}>
            <Icon name="trash-outline" size={17} color={colors.sale} />
            <Txt variant="smallStrong" color={colors.sale}>{t('common.delete')}</Txt>
          </PressableScale>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 140 }]} showsVerticalScrollIndicator={false}>
        {notice ? <Notice icon="information-circle-outline" text={t('cart.adjusted')} action={t('common.close')} onAction={cart.dismissNotice} /> : null}
        {!live ? <Notice icon="cloud-offline-outline" text={t('cart.offline')} tone="warning" /> : null}
        {settings.freeDeliveryFrom > 0 && settings.courierEnabled ? <FreeDelivery left={summary.freeLeft} total={settings.freeDeliveryFrom} /> : null}
        <View style={styles.lines}>
          {lines.map((l, i) => <CartRow key={l.id} line={l} index={i} onRemove={() => removeWithUndo([l.id])} />)}
        </View>
        <Card style={styles.summary}>
          <Txt variant="h3">{t('cart.summary')}</Txt>
          <Row label={t('cart.goods', { n: summary.count })} value={money(summary.oldTotal)} />
          {summary.savings > 0 ? <Row label={t('cart.discount')} value={`−${money(summary.savings)}`} tone={colors.success} /> : null}
          <View style={styles.hr} />
          <Row label={t('cart.total')} value={money(summary.subtotal)} strong />
        </Card>
        <ProductRail title={t('cart.recommend')} products={recommend} />
      </ScrollView>

      <View style={[styles.checkoutBar, shadow.float]}>
        <View style={styles.flex}>
          <Txt variant="tiny">{summary.count ? t('common.items', { n: summary.count }) : t('cart.nothingSelected')}</Txt>
          <Txt variant="h2" numberOfLines={1} adjustsFontSizeToFit>{money(summary.subtotal)}</Txt>
        </View>
        <Button title={t('cart.checkout')} iconRight="arrow-forward" full={false} style={styles.checkoutBtn} disabled={!summary.lines || !live} onPress={() => router.push('/checkout')} />
      </View>
    </View>
  );
}

function CartRow({ line: l, index, onRemove }: { line: CartLine; index: number; onRemove: () => void }) {
  const { t, money, lang } = useT();
  const favs = useFavorites();
  const p = l.product;
  const fav = favs.includes(l.id);
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 50).duration(320)} exiting={FadeOut.duration(180)} layout={LinearTransition.springify().damping(18)}
      style={[styles.row, shadow.soft, !l.selected && styles.rowOff]}>
      <View style={styles.rowTop}>
        <Checkbox checked={l.selected} onPress={() => cart.toggle(l.id)} label={p?.nomi ?? l.id} />
        <PressableScale onPress={() => p && openProduct(p.id)} disabled={!p} scaleTo={0.97} accessibilityLabel={p?.nomi ?? l.id}>
          <ProductImage uri={p?.rasmlar[0]} kategoriya={p?.kategoriya ?? l.id.split('/')[0]} seed={l.id} style={styles.thumb} iconScale={0.42} />
        </PressableScale>
        <View style={styles.flex}>
          <Txt variant="smallStrong" numberOfLines={2}>{p?.nomi ?? l.id}</Txt>
          {p ? <Txt variant="tiny" numberOfLines={1}>{modelsText(p, lang)}</Txt> : null}
          {p ? (
            <View style={styles.priceLine}>
              <Txt variant="bodyStrong" color={p.eskiNarx ? colors.sale : colors.ink}>{money(p.narxi)}</Txt>
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
        <IconButton icon={fav ? 'heart' : 'heart-outline'} color={fav ? colors.sale : colors.muted} label={t('cart.toFavorites')} onPress={() => { prefs.toggleFavorite(l.id); haptic.tap(); }} size={38} bg={colors.surfaceAlt} />
        <IconButton icon="trash-outline" color={colors.muted} label={t('common.delete')} onPress={onRemove} size={38} bg={colors.surfaceAlt} />
        <View style={styles.flex} />
        {p && l.problem !== 'soldout' && l.problem !== 'missing' ? (
          <View style={styles.stepper}>
            <Stepper value={Math.min(l.qty, p.qoldiq)} max={Math.min(p.qoldiq, MAX_QTY)} labelInc={`${p.nomi}: +1`} labelDec={`${p.nomi}: −1`}
              trashAtOne={false} onInc={() => cart.inc(p)} onDec={() => { if (l.qty > 1) cart.dec(p); }} />
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
}

function FreeDelivery({ left, total }: { left: number; total: number }) {
  const { t, money } = useT();
  const progress = useSharedValue(0);
  const ratio = Math.max(0, Math.min(1, 1 - left / total));
  useEffect(() => { progress.value = withTiming(ratio, { duration: 700, easing: ease.out }); }, [ratio, progress]);
  const bar = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));
  return (
    <View style={styles.free}>
      <View style={styles.freeHead}>
        <Icon name={left ? 'bicycle' : 'gift'} size={18} color={left ? colors.primary : colors.success} />
        <Txt variant="smallStrong" color={left ? colors.ink : colors.success} style={styles.flex}>{left ? t('cart.freeLeft', { sum: money(left) }) : t('cart.freeReached')}</Txt>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 6 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.white, marginHorizontal: 16, borderRadius: radius.md },
  deleteSel: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 6 },
  emptyBody: { paddingBottom: 32 },
  body: { padding: 16, gap: 12 },
  lines: { gap: 10 },
  row: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 12, gap: 10 },
  rowOff: { opacity: 0.72 },
  rowTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  thumb: { width: 78, height: 78, borderRadius: radius.md },
  priceLine: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4, flexWrap: 'wrap' },
  strike: { textDecorationLine: 'line-through' },
  problem: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 8, borderRadius: radius.sm, backgroundColor: colors.warningSoft },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepper: { width: 128 },
  summary: { gap: 10 },
  sumRow: { flexDirection: 'row', alignItems: 'center' },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  free: { backgroundColor: colors.white, borderRadius: radius.md, padding: 12, gap: 10 },
  freeHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.tint, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 3 },
  checkoutBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  checkoutBtn: { minWidth: 170 },
});
