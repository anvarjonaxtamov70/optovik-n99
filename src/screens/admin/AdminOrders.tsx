import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
  const { orders, loading } = useAdminOrders(500);
  const [status, setStatus] = useState<OrderStatus | null>(ORDER_STATUSES.includes(params.status as OrderStatus) ? (params.status as OrderStatus) : null);
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const needle = fold(q);
    return orders.filter((o) => (!status || o.holat === status)
      && (!needle || fold(`${orderNumber(o.raqam)} ${o.raqam} ${o.ism} ${o.telefon}`).includes(needle)));
  }, [orders, status, q]);
  const count = (s: OrderStatus) => orders.filter((o) => o.holat === s).length;
  return (
    <View style={styles.root}>
      <Header title={t('admin.orders')} subtitle={String(list.length)} />
      <View style={styles.bar}>
        <Field icon="search" placeholder="N123456, ism, telefon" value={q} onChangeText={setQ} autoCapitalize="none" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label={t('admin.allStatuses')} selected={!status} onPress={() => setStatus(null)} count={orders.length} />
          {ORDER_STATUSES.map((s) => <Chip key={s} label={t(statusKey(s, 'kuryer'))} selected={status === s} onPress={() => setStatus(s)} count={count(s)} />)}
        </ScrollView>
      </View>
      <FlatList
        data={list}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? <View style={styles.gap}>{[0, 1, 2].map((i) => <Skeleton key={i} height={104} radius={18} />)}</View> : <EmptyState icon="receipt-outline" title={t('admin.noOrders')} compact />}
        renderItem={({ item, index }) => (
          <Animated.View entering={index < 10 ? FadeInDown.delay(index * 30).duration(260) : undefined}>
            <OrderCard order={item} showCustomer onPress={() => router.push({ pathname: '/admin/order/[uid]/[id]', params: { uid: item.uid, id: item.id } })} />
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  bar: { backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  chips: { gap: 8 },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  gap: { gap: 10 },
});
