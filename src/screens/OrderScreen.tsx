import { useLocalSearchParams } from 'expo-router';
import { onValue, ref } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { db } from '../../firebaseConfig';
import { ActionButton, EmptyState } from '../components/ShopUI';
import { Message } from '../components/StoreUI';
import { changeOrder, statusLabels, type Order, type OrderStatus } from '../lib/commerce';
import { errorMessage } from '../lib/firebase';
import { useAccount } from '../store/AccountProvider';
import { formatMoney } from '../store/shop';
import { ui } from '../theme';

const transitions: Record<OrderStatus, OrderStatus[]> = { pending: ['accepted', 'cancelled'], accepted: ['shipped', 'cancelled'], shipped: ['delivered', 'cancelled'], delivered: ['returned'], cancelled: [], returned: [] };
export default function OrderScreen() {
  const { uid, id } = useLocalSearchParams<{ uid: string; id: string }>();
  const { user, admin } = useAccount();
  if (!user || (!admin && user.uid !== uid) || typeof uid !== 'string' || typeof id !== 'string' || !/^[a-f0-9]{24}$/.test(id) || !uid || /[.#$\[\]/]/.test(uid)) return <View style={ui.screen}><EmptyState title="Buyurtma topilmadi" message="Bu buyurtmani ko‘rish uchun hisobingizga kiring." /></View>;
  return <OrderDetails key={uid + ':' + id + ':' + user.uid} uid={uid} id={id} admin={admin} />;
}
function OrderDetails({ uid, id, admin }: { uid: string; id: string; admin: boolean }) {
  const [order, setOrder] = useState<Order | null>(null);
  const [problem, setProblem] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    return onValue(ref(db, 'orders/' + uid + '/' + id), (s) => { setOrder(s.val()); setLoaded(true); setProblem(''); }, () => { setProblem('Buyurtmani yuklab bo‘lmadi.'); setLoaded(true); });
  }, [uid, id, attempt]);
  async function change(status: OrderStatus) {
    if (!order || busy) return;
    setBusy(true); setProblem('');
    try { await changeOrder(uid, id, status, order.status); } catch (e) { setProblem(errorMessage(e)); } finally { setBusy(false); }
  }
  function confirm(status: OrderStatus) {
    Alert.alert(statusLabels[status], status === 'delivered' ? 'Mahsulot topshirildi va naqd to‘lov olindimi?' : status === 'cancelled' || status === 'returned' ? 'Mahsulot omborga qaytariladi. Amalni tasdiqlaysizmi?' : 'Buyurtma holatini o‘zgartirasizmi?', [
      { text: 'Orqaga', style: 'cancel' }, { text: 'Tasdiqlash', onPress: () => void change(status) },
    ]);
  }
  if (!order) return <View style={[ui.screen, { padding: 20 }]}><EmptyState title={loaded ? 'Buyurtma topilmadi' : 'Yuklanmoqda…'} message={problem || 'Buyurtmani faqat uning egasi va do‘kon admini ko‘ra oladi.'} action={problem ? { label: 'Qayta urinish', onPress: () => { setLoaded(false); setOrder(null); setProblem(''); setAttempt((n) => n + 1); } } : undefined} /></View>;
  return <SafeAreaView style={ui.screen} edges={['bottom', 'left', 'right']}><ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
    <View style={ui.card}><Text style={ui.name}>Buyurtma #{id.slice(-6).toUpperCase()}</Text><Text style={ui.price}>{statusLabels[order.status]}</Text><Text style={ui.secondary}>{new Date(order.createdAt).toLocaleString('ru-RU')}</Text></View>
    {order.items.map((item) => <View key={item.id} style={ui.card}><Text style={ui.name}>{item.name}</Text><Text style={ui.secondary}>{item.quantity} × {formatMoney(item.price)}</Text></View>)}
    <View style={ui.card}><Text style={ui.name}>{order.customer.name}</Text><Text style={ui.secondary}>{order.customer.phone}</Text>
      <Text style={ui.secondary}>{order.delivery === 'pickup' ? 'Do‘kondan olib ketish' : order.customer.address}</Text>
      {!!order.note && <Text style={ui.secondary}>{order.note}</Text>}
      <Text style={ui.secondary}>Mahsulotlar: {formatMoney(order.subtotal)}</Text><Text style={ui.secondary}>Yetkazish: {formatMoney(order.shipping)}</Text>
      <Text style={ui.secondary}>Cashback ishlatildi: {formatMoney(order.cashbackUsed)}</Text><Text style={ui.price}>{formatMoney(order.total)}</Text>
      <Text style={ui.secondary}>To‘lov: mahsulotni olganda naqd</Text>
    </View>
    <Message text={problem} />
    {(admin ? transitions[order.status] : order.status === 'pending' ? ['cancelled' as const] : []).map((status) => <ActionButton key={status} label={statusLabels[status]} disabled={busy} onPress={() => confirm(status)} />)}
  </ScrollView></SafeAreaView>;
}
