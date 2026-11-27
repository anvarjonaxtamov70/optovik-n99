import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { OrderCard } from '../components/shop/OrderBits';
import { Segmented } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { Header } from '../components/ui/Header';
import { Skeleton } from '../components/ui/Skeleton';
import { isActive } from '../domain/order';
import { useT } from '../i18n';
import { useMyOrders, usePendingOrderRecovery, closePendingAttempt } from '../state/orders';
import { Button } from '../components/ui/Button';
import { confirmAsync } from '../lib/confirm';
import { usesOrderBackend } from '../lib/orderBackend';
import { showToast } from '../state/toast';
import { colors, radius } from '../theme/tokens';

export default function OrdersScreen() {
  const { t } = useT();
  usePendingOrderRecovery();
  const { orders, loading, error } = useMyOrders();
  const [tab, setTab] = useState<'active' | 'done'>('active');
  const [closing,setClosing]=useState(false);
  const closeAttempt=async()=>{
    if(closing)return;
    if(!await confirmAsync(t('orders.closeAttempt'),t('orders.closeAttemptConfirm'),{ok:t('orders.closeAttempt'),cancel:t('common.cancel'),destructive:true}))return;
    setClosing(true);
    try{
      const outcome=await closePendingAttempt();
      showToast(t(outcome==='abandoned'?'orders.attemptClosed':outcome==='exists'?'orders.attemptExists':'orders.attemptNone'));
    }catch{showToast(t('common.error'),{kind:'error'});}
    finally{setClosing(false);}
  };
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
        ListHeaderComponent={usesOrderBackend?<Button title={t('orders.closeAttempt')} variant="outline" loading={closing} onPress={()=>{void closeAttempt();}}/>:undefined}
        data={list}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={loading ? (
          <View style={styles.gap}>{[0, 1, 2].map((i) => <Skeleton key={i} height={112} radius={radius.lg} />)}</View>
        ) : error ? (
          <EmptyState icon="cloud-offline-outline" title={t('orders.errorTitle')} text={t('orders.errorText')} />
        ) : (
          <EmptyState icon="receipt-outline" title={tab === 'active' ? t('orders.emptyTitle') : t('orders.emptyDone')} text={tab === 'active' ? t('orders.emptyText') : undefined}
            action={tab === 'active' ? { label: t('cart.toCatalog'), onPress: () => router.navigate('/') } : undefined} />
        )}
        renderItem={({ item }) => <OrderCard order={item} onPress={() => router.push({ pathname: '/orders/[id]', params: { id: item.id } })} />}
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
