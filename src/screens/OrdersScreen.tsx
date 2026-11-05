import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { OrderCard } from '../components/shop/OrderBits';
import { Segmented } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { Header } from '../components/ui/Header';
import { Skeleton } from '../components/ui/Skeleton';
import { isActive } from '../domain/order';
import { useT } from '../i18n';
import { useMyOrders } from '../state/orders';
import { colors } from '../theme/tokens';

export default function OrdersScreen() {
  const { t } = useT();
  const { orders, loading } = useMyOrders();
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const list = orders.filter((o) => (tab === 'active' ? isActive(o.holat) : !isActive(o.holat)));
  return (
    <View style={styles.root}>
      <Header title={t('orders.title')} />
      <View style={styles.seg}>
        <Segmented value={tab} onChange={setTab} options={[
          { value: 'active', label: `${t('orders.active')}${orders.filter((o) => isActive(o.holat)).length ? ` · ${orders.filter((o) => isActive(o.holat)).length}` : ''}` },
          { value: 'done', label: t('orders.done') },
        ]} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? (
          <View style={styles.gap}>{[0, 1, 2].map((i) => <Skeleton key={i} height={112} radius={18} />)}</View>
        ) : (
          <EmptyState icon="receipt-outline" title={tab === 'active' ? t('orders.emptyTitle') : t('orders.emptyDone')} text={tab === 'active' ? t('orders.emptyText') : undefined}
            action={tab === 'active' ? { label: t('cart.toCatalog'), onPress: () => router.navigate('/') } : undefined} />
        )}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(320)}>
            <OrderCard order={item} onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })} />
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  seg: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white },
  list: { padding: 16, gap: 10, paddingBottom: 40 },
  gap: { gap: 10 },
});
