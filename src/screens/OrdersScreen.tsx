import { router } from 'expo-router';
import { FlatList, Pressable, Text, View } from 'react-native';

import { ActionButton, EmptyState } from '../components/ShopUI';
import { Message } from '../components/StoreUI';
import { statusLabels, useOrders, type Order } from '../lib/commerce';
import { useAccount } from '../store/AccountProvider';
import { formatMoney } from '../store/shop';
import { ui } from '../theme';

export function OrderRow({ order }: { order: Order }) {
  return <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/order/[uid]/[id]', params: { uid: order.uid, id: order.id } })} style={ui.card}>
    <View style={ui.row}><Text style={ui.name}>#{order.id.slice(-6).toUpperCase()}</Text><Text style={ui.category}>{statusLabels[order.status]}</Text></View>
    <Text style={ui.price}>{formatMoney(order.total)}</Text><Text style={ui.secondary}>{new Date(order.createdAt).toLocaleString('ru-RU')}</Text>
  </Pressable>;
}
export default function OrdersScreen() {
  const { user } = useAccount();
  const { orders, loading, problem, retry } = useOrders(user?.uid);
  return <View style={ui.screen}><View style={ui.body}><FlatList data={orders} keyExtractor={(o) => o.id} contentContainerStyle={{ padding: 20, gap: 14 }} refreshing={loading} onRefresh={retry}
    ListHeaderComponent={<><Message text={problem} />{problem && <ActionButton label="Qayta urinish" onPress={retry} />}</>}
    ListEmptyComponent={<EmptyState title={loading ? 'Yuklanmoqda…' : 'Hali buyurtma yo‘q'} message="Tasdiqlangan buyurtmalaringiz shu yerda ko‘rinadi." />} renderItem={({ item }) => <OrderRow order={item} />} /></View></View>;
}
