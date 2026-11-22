import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ADMIN_WIDE, useAdminShell } from '../../components/admin/AdminShell';
import { OrderCard, statusKey } from '../../components/shop/OrderBits';
import { Chip } from '../../components/ui/Controls';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { Header } from '../../components/ui/Header';
import { Skeleton } from '../../components/ui/Skeleton';
import { ORDER_STATUSES, orderNumber, type OrderStatus } from '../../domain/order';
import { fold } from '../../domain/text';
import { useT } from '../../i18n';
import { useAdminOrders } from '../../state/orders';
import { colors } from '../../theme/tokens';

export default function AdminOrders() {
  const params = useLocalSearchParams<{ status?: string }>();
  const { t } = useT();
  const { sidebar } = useAdminShell();
  const { width } = useWindowDimensions();
  const wide = width >= ADMIN_WIDE;
  const { orders, loading, error } = useAdminOrders(500);
  const [status, setStatus] = useState<OrderStatus | null>(ORDER_STATUSES.includes(params.status as OrderStatus) ? (params.status as OrderStatus) : null);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const needle = fold(q);
    return orders.filter((o) => (!status || o.holat === status)
      && (!needle || fold(`${orderNumber(o.raqam)} ${o.raqam} ${o.ism} ${o.telefon}`).includes(needle)));
  }, [orders, status, q]);
  const count = (s: OrderStatus) => orders.filter((o) => o.holat === s).length;
  const chips = [
    <Chip key="all" label={t('admin.allStatuses')} selected={!status} onPress={() => setStatus(null)} count={orders.length} />,
    ...ORDER_STATUSES.map((s) => <Chip key={s} label={t(statusKey(s, 'kuryer'))} selected={status === s} onPress={() => setStatus(s)} count={count(s)} />),
  ];
  const columns = wide ? 2 : 1;
  return (
    <View style={styles.root}>
      <Header title={t('admin.orders')} subtitle={String(list.length)} back={!sidebar} />
      <View style={styles.bar}>
        <View style={[styles.barInner, wide && styles.wideInner]}>
          <Field icon="search" placeholder={t('admin.searchOrders')} value={q} onChangeText={setQ} autoCapitalize="none" />
          {wide
            ? <View style={styles.wrap}>{chips}</View>
            : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{chips}</ScrollView>}
        </View>
      </View>
      <FlatList
        key={`cols-${columns}`}
        data={list}
        numColumns={columns}
        keyExtractor={(o) => o.id}
        contentContainerStyle={[styles.list, wide && styles.wideInner]}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        ListEmptyComponent={loading ? <View style={styles.gap}>{[0, 1, 2].map((i) => <Skeleton key={i} height={104} radius={18} />)}</View>
          : <EmptyState icon={error ? 'cloud-offline-outline' : 'receipt-outline'} title={error ? t('admin.ordersError') : t('admin.noOrders')} compact />}
        renderItem={({ item }) => (
          <View style={columns > 1 ? styles.cell : undefined}>
            <OrderCard order={item} showCustomer onPress={() => router.push({ pathname: '/admin/order/[uid]/[id]', params: { uid: item.uid, id: item.id } })} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: { backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  barInner: { gap: 10, width: '100%', alignSelf: 'center' },
  wideInner: { maxWidth: 1240, width: '100%', alignSelf: 'center' },
  chips: { gap: 8, paddingVertical: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  // Ikki ustun: `flex: 1` o'rniga 50% — oxirgi toq buyurtma ham yarim kenglikda qoladi.
  row: { marginHorizontal: -5 },
  cell: { width: '50%', paddingHorizontal: 5 },
  gap: { gap: 10 },
});
