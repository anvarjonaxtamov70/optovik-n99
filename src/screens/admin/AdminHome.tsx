import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { OrderCard } from '../../components/shop/OrderBits';
import { ProductImage } from '../../components/shop/ProductImage';
import { Card, ListRow, Pill } from '../../components/ui/Controls';
import { Header } from '../../components/ui/Header';
import { Icon, type IconName } from '../../components/ui/Icon';
import { PressableScale } from '../../components/ui/PressableScale';
import { Txt } from '../../components/ui/Txt';
import { isActive } from '../../domain/order';
import { LOW_STOCK } from '../../domain/products';
import { useT } from '../../i18n';
import { adminSignOut, useAccount } from '../../state/account';
import { useProducts } from '../../state/catalog';
import { useAdminOrders } from '../../state/orders';
import { colors, gradients, radius, shadow } from '../../theme/tokens';

export default function AdminHome() {
  const insets = useSafeAreaInsets();
  const { t, money } = useT();
  const account = useAccount();
  const { orders } = useAdminOrders(300);
  const products = useProducts();
  const stats = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const today = orders.filter((o) => o.createdAt >= start.getTime() && o.holat !== 'bekor');
    return {
      fresh: orders.filter((o) => o.holat === 'yangi').length,
      active: orders.filter((o) => isActive(o.holat)).length,
      todayCount: today.length,
      todaySum: today.reduce((s, o) => s + o.jami, 0),
    };
  }, [orders]);
  const low = useMemo(() => products.filter((p) => p.qoldiq <= LOW_STOCK).sort((a, b) => a.qoldiq - b.qoldiq).slice(0, 8), [products]);
  const fresh = orders.filter((o) => o.holat === 'yangi').slice(0, 5);

  return (
    <View style={styles.root}>
      <Header title={t('admin.title')} subtitle={account.email ?? undefined} onBack={() => router.dismissTo('/profile')} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 30 }]}>
        <Animated.View entering={FadeInDown.duration(320)} style={styles.statsRow}>
          <Stat big icon="flash" label={t('admin.newOrders')} value={String(stats.fresh)} onPress={() => router.push({ pathname: '/admin/orders', params: { status: 'yangi' } })} />
          <View style={styles.statsCol}>
            <Stat icon="sync" label={t('admin.activeOrders')} value={String(stats.active)} onPress={() => router.push('/admin/orders')} />
            <Stat icon="today" label={t('admin.todayOrders')} value={String(stats.todayCount)} onPress={() => router.push('/admin/orders')} />
          </View>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(60).duration(320)}>
          <Card style={styles.revenue}>
            <Txt variant="label">{t('admin.todayRevenue')}</Txt>
            <Txt style={styles.revenueValue}>{money(stats.todaySum)}</Txt>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(320)}>
          <Card padded={false} style={styles.menu}>
            <ListRow icon="receipt-outline" title={t('admin.orders')} value={String(orders.length)} onPress={() => router.push('/admin/orders')} />
            <ListRow icon="cube-outline" title={t('admin.products')} value={String(products.length)} onPress={() => router.push('/admin/products')} />
            <ListRow icon="images-outline" title={t('admin.banners')} onPress={() => router.push('/admin/banners')} />
            <ListRow icon="settings-outline" title={t('admin.settings')} onPress={() => router.push('/admin/settings')} last />
          </Card>
        </Animated.View>

        {fresh.length ? (
          <View style={styles.gap}>
            <Txt variant="h3">{t('admin.newOrders')}</Txt>
            {fresh.map((o) => <OrderCard key={o.id} order={o} showCustomer onPress={() => router.push({ pathname: '/admin/order/[uid]/[id]', params: { uid: o.uid, id: o.id } })} />)}
          </View>
        ) : null}

        {low.length ? (
          <View style={styles.gap}>
            <Txt variant="h3">{t('admin.lowStock')}</Txt>
            <Card padded={false} style={styles.menu}>
              {low.map((p, i) => (
                <PressableScale key={p.id} onPress={() => router.push({ pathname: '/admin/product', params: { id: p.id } })} style={[styles.lowRow, i < low.length - 1 && styles.line]} accessibilityLabel={p.nomi}>
                  <ProductImage uri={p.rasmlar[0]} kategoriya={p.kategoriya} seed={p.id} style={styles.thumb} iconScale={0.45} />
                  <Txt variant="smallStrong" numberOfLines={1} style={styles.flex}>{p.nomi}</Txt>
                  <Pill text={p.qoldiq ? `${p.qoldiq} ${t('common.pcs')}` : t('admin.outOfStock')} tone={p.qoldiq ? 'warning' : 'sale'} />
                </PressableScale>
              ))}
            </Card>
          </View>
        ) : null}

        <PressableScale onPress={() => void adminSignOut().then(() => router.dismissTo('/profile'))} style={styles.signOut} accessibilityLabel={t('admin.signOut')}>
          <Icon name="log-out-outline" size={18} color={colors.sale} />
          <Txt variant="bodyStrong" color={colors.sale}>{t('admin.signOut')}</Txt>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

function Stat({ icon, label, value, onPress, big }: { icon: IconName; label: string; value: string; onPress: () => void; big?: boolean }) {
  const body = (
    <>
      <View style={[styles.statIcon, big && styles.statIconBig]}><Icon name={icon} size={18} color={big ? colors.primary : colors.primary} /></View>
      <Txt style={[styles.statValue, big && { color: colors.white, fontSize: 40, lineHeight: 46 }]}>{value}</Txt>
      <Txt variant="tiny" color={big ? 'rgba(255,255,255,0.85)' : colors.muted} numberOfLines={2}>{label}</Txt>
    </>
  );
  return (
    <PressableScale onPress={onPress} scaleTo={0.97} style={[styles.stat, big ? styles.statBig : shadow.soft]} accessibilityLabel={`${label}: ${value}`}>
      {big ? <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: radius.lg }]} /> : null}
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: 16, gap: 14, width: '100%', maxWidth: 760, alignSelf: 'center' },
  gap: { gap: 10 },
  statsRow: { flexDirection: 'row', gap: 10 },
  statsCol: { flex: 1, gap: 10 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, gap: 4, overflow: 'hidden' },
  statBig: { justifyContent: 'flex-end' },
  statIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  statIconBig: { backgroundColor: colors.white },
  statValue: { fontFamily: 'Manrope_800ExtraBold', fontSize: 24, lineHeight: 30, color: colors.ink },
  revenue: { gap: 4 },
  revenueValue: { fontFamily: 'Unbounded_700Bold', fontSize: 24, lineHeight: 32, color: colors.ink },
  menu: { paddingHorizontal: 14 },
  lowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  thumb: { width: 40, height: 40, borderRadius: 10 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
});
