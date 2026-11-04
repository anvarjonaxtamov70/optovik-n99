import { httpsCallable } from 'firebase/functions';
import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';

import { ActionButton, EmptyState } from '../components/ShopUI';
import { Field, Message, Pill } from '../components/StoreUI';
import { useOrders } from '../lib/commerce';
import { errorMessage, functions } from '../lib/firebase';
import { useAccount } from '../store/AccountProvider';
import { useShop } from '../store/ShopProvider';
import { formatMoney } from '../store/shop';
import { ui } from '../theme';
import { OrderRow } from './OrdersScreen';

export default function AdminScreen() {
  const { user, admin } = useAccount();
  const { state } = useShop();
  const { orders, problem, loading, retry } = useOrders(admin ? user?.uid : undefined, true);
  const [tab, setTab] = useState('Buyurtmalar');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [expectedRevision, setExpectedRevision] = useState<number | null>(null);
  const [edit, setEdit] = useState({ id: '', nomi: '', narxi: '', qoldiq: '', rasm: '', tavsif: '', artikul: '', model: '', eskiNarx: '' });
  if (!admin) return <View style={ui.screen}><EmptyState title="Ruxsat yo‘q" message="Bu bo‘lim do‘kon admini uchun." /></View>;
  async function save() {
    setBusy(true); setMessage('');
    try {
      await httpsCallable(functions, 'saveProduct')({ ...edit, expectedRevision, narxi: Number(edit.narxi), qoldiq: Number(edit.qoldiq), eskiNarx: edit.eskiNarx ? Number(edit.eskiNarx) : 0 });
      setExpectedRevision((v) => (v ?? 0) + 1); setMessage('Mahsulot saqlandi.');
    } catch (e) { setMessage(errorMessage(e)); } finally { setBusy(false); }
  }
  const header = <View style={{ gap: 16 }}><Text style={ui.name}>Do‘kon boshqaruvi</Text><View style={ui.row}>
    {['Buyurtmalar', 'Mahsulotlar'].map((x) => <Pill key={x} text={x} selected={tab === x} onPress={() => setTab(x)} />)}</View><Message text={message || problem} /></View>;
  if (tab === 'Buyurtmalar') return <View style={ui.screen}><View style={ui.body}><FlatList data={orders} keyExtractor={(o) => o.id} refreshing={loading} onRefresh={retry} contentContainerStyle={{ padding: 20, gap: 14 }}
    ListHeaderComponent={<>{header}<Text style={[ui.secondary, { marginVertical: 16 }]}>So‘nggi 100 buyurtma · {orders.filter((o) => o.status === 'pending').length} ta yangi</Text></>}
    ListEmptyComponent={<EmptyState title={loading ? 'Yuklanmoqda…' : 'Buyurtma yo‘q'} message="Mijoz buyurtmalari shu yerda ko‘rinadi." />} renderItem={({ item }) => <OrderRow order={item} />} /></View></View>;
  return <View style={ui.screen}><View style={ui.body}><FlatList data={state.products} keyExtractor={(p) => p.id} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 12 }} ListHeaderComponent={<View style={{ gap: 16 }}>{header}
    <ActionButton label="Yangi mahsulot" disabled={busy} onPress={() => { setExpectedRevision(null); setEdit({ id: '', nomi: '', narxi: '', qoldiq: '', rasm: '', tavsif: '', artikul: '', model: '', eskiNarx: '' }); }} />
    <Text style={ui.secondary}>Yangi mahsulot uchun unikal yo‘l kiriting. Masalan: gazel/moy-filtri. Mavjud tovarni pastdan tanlang.</Text>
    {(['id', 'nomi', 'narxi', 'qoldiq', 'artikul', 'model', 'rasm', 'tavsif', 'eskiNarx'] as const).map((key) => <Field key={key} label={({ id: 'Kategoriya/ID', nomi: 'Nomi', narxi: 'Narxi (so‘m)', qoldiq: 'Qoldiq (dona)', artikul: 'Artikul', model: 'Mos avtomobil', rasm: 'Rasm HTTPS manzili', tavsif: 'Tavsif', eskiNarx: 'Eski narx (aksiya uchun)' })[key]}
      value={edit[key]} editable={!busy && (key !== 'id' || expectedRevision === null)} keyboardType={['narxi', 'qoldiq', 'eskiNarx'].includes(key) ? 'numeric' : 'default'} onChangeText={(value) => setEdit({ ...edit, [key]: value })} />)}
    <ActionButton label={busy ? 'Saqlanmoqda…' : 'Mahsulotni saqlash'} disabled={busy || !edit.id || !edit.nomi || !edit.narxi || !edit.qoldiq} onPress={() => void save()} />
    <Text style={ui.name}>Katalogdan tanlash</Text>
  </View>} renderItem={({ item }) => <Pressable accessibilityRole="button" style={ui.card} disabled={busy} onPress={() => { setExpectedRevision(item.revision ?? 0); setEdit({ id: item.id, nomi: item.nomi, narxi: String(item.narxi), qoldiq: String(item.qoldiq), artikul: item.artikul ?? '', model: item.model ?? '', rasm: item.rasm ?? '', tavsif: item.tavsif ?? '', eskiNarx: item.eskiNarx ? String(item.eskiNarx) : '' }); setMessage('Tanlandi: ' + item.nomi + '. Yuqoridagi maydonlarni tahrirlang.'); }}>
    <Text style={ui.name}>{item.nomi}</Text><Text style={ui.secondary}>{formatMoney(item.narxi)} · {item.qoldiq} dona</Text></Pressable>} /></View></View>;
}
