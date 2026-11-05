import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatDate, OrderTimeline, StatusPill } from '../components/shop/OrderBits';
import { ProductImage } from '../components/shop/ProductImage';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { Header } from '../components/ui/Header';
import { Icon, type IconName } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { Skeleton } from '../components/ui/Skeleton';
import { Txt } from '../components/ui/Txt';
import { canCustomerCancel, orderNumber, recomputeTotals, type Order } from '../domain/order';
import { displayPhone } from '../domain/phone';
import { useT } from '../i18n';
import { haptic } from '../lib/haptics';
import { callPhone } from '../lib/links';
import { openProduct } from '../lib/nav';
import { useUid } from '../state/account';
import { cart } from '../state/cart';
import { catalogStore, useSettings } from '../state/catalog';
import { cancelMyOrder, useOrder } from '../state/orders';
import { showToast } from '../state/toast';
import { colors, radius } from '../theme/tokens';

export default function OrderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const uid = useUid();
  const { order, loading } = useOrder(uid, id);
  const { t } = useT();
  if (!order) {
    return (
      <View style={styles.root}>
        <Header title={t('orders.title')} />
        {loading ? <View style={styles.body}><Skeleton height={220} radius={18} /><Skeleton height={160} radius={18} /></View>
          : <EmptyState icon="receipt-outline" title={t('orders.notFound')} />}
      </View>
    );
  }
  return <OrderView order={order} />;
}

export function OrderView({ order: o, admin }: { order: Order; admin?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const { t, money, lang } = useT();
  const settings = useSettings();
  const [busy, setBusy] = useState(false);
  const totals = recomputeTotals(o);

  const cancel = () => Alert.alert(t('orders.cancel'), t('orders.cancelConfirm'), [
    { text: t('common.no'), style: 'cancel' },
    { text: t('common.yes'), style: 'destructive', onPress: async () => {
      setBusy(true);
      try { await cancelMyOrder(o); haptic.success(); showToast(t('orders.cancelled'), { kind: 'success' }); } catch { showToast(t('common.error'), { kind: 'error' }); } finally { setBusy(false); }
    } },
  ]);
  const repeat = () => {
    const byId = catalogStore.get().byId;
    let added = 0;
    for (const it of o.items) {
      const p = byId.get(it.id);
      if (p && p.qoldiq > 0) { cart.set(p, Math.min(it.soni, p.qoldiq)); added++; }
    }
    if (added) { haptic.success(); showToast(t('orders.repeated'), { kind: 'success', action: { label: t('product.goToCart'), onPress: () => router.navigate('/cart') } }); }
    else showToast(t('orders.repeatNone'), { kind: 'error' });
  };

  return (
    <View style={styles.root}>
      <Header title={t('orders.item', { num: orderNumber(o.raqam) })} subtitle={formatDate(o.createdAt, lang)} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        <Animated.View entering={FadeInDown.duration(320)}>
          <Card style={styles.gap}>
            <View style={styles.row}>
              <Txt variant="h3" style={styles.flex}>{t('orders.status')}</Txt>
              <StatusPill status={o.holat} kind={o.yetkazish.turi} />
            </View>
            <OrderTimeline order={o} />
          </Card>
        </Animated.View>

        {admin}

        <Animated.View entering={FadeInDown.delay(80).duration(320)}>
          <Card style={styles.gap}>
            <Txt variant="h3">{t('orders.contents')}</Txt>
            {o.items.map((it) => {
              const p = catalogStore.get().byId.get(it.id);
              return (
                <PressableScale key={it.id} onPress={() => p && openProduct(it.id)} disabled={!p} style={styles.item} accessibilityLabel={it.nomi}>
                  <ProductImage uri={p?.rasmlar[0]} kategoriya={it.id.split('/')[0]} seed={it.id} style={styles.thumb} iconScale={0.45} />
                  <View style={styles.flex}>
                    <Txt variant="smallStrong" numberOfLines={2}>{it.nomi}</Txt>
                    <Txt variant="tiny">{it.soni} × {money(it.narxi)}</Txt>
                  </View>
                  <Txt variant="bodyStrong">{money(it.soni * it.narxi)}</Txt>
                </PressableScale>
              );
            })}
            <View style={styles.hr} />
            <Line label={t('cart.goods', { n: totals.soni })} value={money(totals.summa)} />
            <Line label={t('checkout.deliveryFee')} value={o.yetkazish.turi === 'olib' || !o.yetkazishNarxi ? (o.yetkazish.turi === 'olib' ? t('checkout.free') : t('checkout.byAgreement')) : money(o.yetkazishNarxi)} />
            <Line label={t('cart.total')} value={money(totals.jami)} strong />
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(140).duration(320)}>
          <Card style={styles.gap}>
            <Info icon={o.yetkazish.turi === 'kuryer' ? 'bicycle-outline' : 'storefront-outline'} title={t('orders.delivery')}
              text={o.yetkazish.turi === 'kuryer' ? `${t('checkout.courier')}: ${o.yetkazish.manzil ?? ''}${o.yetkazish.moljal ? ` (${o.yetkazish.moljal})` : ''}` : `${t('checkout.pickup')}: ${settings.address}`} />
            <Info icon="cash-outline" title={t('orders.payment')} text={t('checkout.cash')} />
            <Info icon="person-outline" title={t('checkout.contact')} text={`${o.mijoz.ism}, ${displayPhone(o.mijoz.telefon)}`} />
            {o.izoh ? <Info icon="chatbubble-ellipses-outline" title={t('checkout.comment')} text={o.izoh} /> : null}
          </Card>
        </Animated.View>

        {!admin ? (
          <View style={styles.actions}>
            <Button title={t('orders.repeat')} icon="repeat" variant="secondary" onPress={repeat} />
            {settings.phone ? <Button title={t('orders.callShop')} icon="call-outline" variant="outline" onPress={() => callPhone(settings.phone)} /> : null}
            {canCustomerCancel(o) ? <Button title={t('orders.cancel')} variant="ghost" loading={busy} onPress={cancel} /> : null}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Info({ icon, title, text }: { icon: IconName; title: string; text: string }) {
  return (
    <View style={styles.info}>
      <View style={styles.infoIcon}><Icon name={icon} size={18} color={colors.primary} /></View>
      <View style={styles.flex}>
        <Txt variant="label">{title}</Txt>
        <Txt variant="body" color={colors.ink}>{text}</Txt>
      </View>
    </View>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Txt variant={strong ? 'h3' : 'body'} style={styles.flex}>{label}</Txt>
      <Txt variant={strong ? 'h3' : 'bodyStrong'}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  gap: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 52, height: 52, borderRadius: radius.sm },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  info: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  infoIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: 10, marginTop: 4 },
});
