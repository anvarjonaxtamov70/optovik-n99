import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ADMIN_WIDE, useAdminShell } from '../../components/admin/AdminShell';
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
import { colors, fonts, gradients, radius, shadow } from '../../theme/tokens';

const IS_WEB = Platform.OS === 'web';

export default function AdminHome() {
  const insets = useSafeAreaInsets();
  const { t, money } = useT();
  const account = useAccount();
  const { sidebar } = useAdminShell();
  const { width } = useWindowDimensions();
  const wide = width >= ADMIN_WIDE;
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

  const openOrders = (status?: string) => router.push(status ? { pathname: '/admin/orders', params: { status } } : '/admin/orders');
  const freshBlock = fresh.length ? (
    <View style={styles.gap}>
      <Txt variant="h3">{t('admin.newOrders')}</Txt>
      {fresh.map((o) => <OrderCard key={o.id} order={o} showCustomer onPress={() => router.push({ pathname: '/admin/order/[uid]/[id]', params: { uid: o.uid, id: o.id } })} />)}
    </View>
  ) : null;
  const lowBlock = low.length ? (
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
  ) : null;
  const revenue = (
    <Card style={[styles.revenue, wide && styles.revenueWide]}>
      <Txt variant="label">{t('admin.todayRevenue')}</Txt>
      <Txt style={styles.revenueValue} numberOfLines={1}>{money(stats.todaySum)}</Txt>
    </Card>
  );

  return (
    <View style={styles.root}>
      <Header title={t('admin.title')} subtitle={account.email ?? undefined} back={!IS_WEB} onBack={() => router.dismissTo('/profile')} />
      <ScrollView contentContainerStyle={[styles.body, wide && styles.bodyWide, { paddingBottom: insets.bottom + 30 }]}>
        {wide ? (
          <Animated.View entering={FadeInDown.duration(320)} style={styles.statsWide}>
            <Stat big icon="flash" label={t('admin.newOrders')} value={String(stats.fresh)} onPress={() => openOrders('yangi')} />
            <Stat icon="sync" label={t('admin.activeOrders')} value={String(stats.active)} onPress={() => openOrders()} />
            <Stat icon="today" label={t('admin.todayOrders')} value={String(stats.todayCount)} onPress={() => openOrders()} />
            {revenue}
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.duration(320)} style={styles.statsRow}>
              <Stat big icon="flash" label={t('admin.newOrders')} value={String(stats.fresh)} onPress={() => openOrders('yangi')} />
              <View style={styles.statsCol}>
                <Stat icon="sync" label={t('admin.activeOrders')} value={String(stats.active)} onPress={() => openOrders()} />
                <Stat icon="today" label={t('admin.todayOrders')} value={String(stats.todayCount)} onPress={() => openOrders()} />
              </View>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(60).duration(320)}>{revenue}</Animated.View>
          </>
        )}

        {!sidebar ? (
          <Animated.View entering={FadeInDown.delay(100).duration(320)}>
            <Card padded={false} style={styles.menu}>
              <ListRow icon="receipt-outline" title={t('admin.orders')} value={String(orders.length)} onPress={() => openOrders()} />
              <ListRow icon="cube-outline" title={t('admin.products')} value={String(products.length)} onPress={() => router.push('/admin/products')} />
              <ListRow icon="images-outline" title={t('admin.banners')} onPress={() => router.push('/admin/banners')} />
              <ListRow icon="settings-outline" title={t('admin.settings')} onPress={() => router.push('/admin/settings')} last />
            </Card>
          </Animated.View>
        ) : null}

        {wide ? (
          <View style={styles.columns}>
            <View style={styles.column}>{freshBlock ?? <Txt variant="small">{t('admin.noOrders')}</Txt>}</View>
            <View style={styles.column}>{lowBlock}</View>
          </View>
        ) : <>{freshBlock}{lowBlock}</>}

        {!sidebar ? (
          <PressableScale onPress={() => void adminSignOut().then(() => { if (!IS_WEB) router.dismissTo('/profile'); })} style={styles.signOut} accessibilityLabel={t('admin.signOut')}>
            <Icon name="log-out-outline" size={18} color={colors.sale} />
            <Txt variant="bodyStrong" color={colors.sale}>{t('admin.signOut')}</Txt>
          </PressableScale>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ icon, label, value, onPress, big }: { icon: IconName; label: string; value: string; onPress: () => void; big?: boolean }) {
  const body = (
    <>
      <View style={[styles.statIcon, big && styles.statIconBig]}><Icon name={icon} size={18} color={big ? colors.primary : colors.primary} /></View>
      <Txt style={[styles.statValue, big && { color: colors.white, fontSize: 40, lineHeight: 46 }]}>{value}</Txt>
      <Txt variant="tiny" color={big ? colors.onBrandMuted : colors.muted} numberOfLines={2}>{label}</Txt>
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
  bodyWide: { maxWidth: 1240, padding: 24, gap: 20 },
  gap: { gap: 10 },
  statsWide: { flexDirection: 'row', gap: 12, minHeight: 150 },
  columns: { flexDirection: 'row', gap: 20, alignItems: 'flex-start' },
  column: { flex: 1, minWidth: 0, gap: 10 },
  revenueWide: { flex: 1.4, justifyContent: 'flex-end' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statsCol: { flex: 1, gap: 10 },
  stat: { flex: 1, backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, gap: 4, overflow: 'hidden' },
  statBig: { justifyContent: 'flex-end' },
  statIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  statIconBig: { backgroundColor: colors.white },
  statValue: { fontFamily: fonts.heavy, fontSize: 24, lineHeight: 30, color: colors.ink },
  revenue: { gap: 4 },
  revenueValue: { fontFamily: fonts.display, fontSize: 24, lineHeight: 32, color: colors.ink },
  menu: { paddingHorizontal: 14 },
  lowRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  line: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  thumb: { width: 40, height: 40, borderRadius: 10 },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 },
});
