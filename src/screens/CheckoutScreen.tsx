import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, ConnectionStatus, EmptyState } from '../components/ShopUI';
import { Field, Message, Pill } from '../components/StoreUI';
import { createOrder, useCommerceSettings, type CheckoutInput } from '../lib/commerce';
import { commerceEnabled, errorMessage } from '../lib/firebase';
import { readLocal, saveLocal } from '../lib/storage';
import { useAccount } from '../store/AccountProvider';
import { useShop } from '../store/ShopProvider';
import { cartLines, cartSummary, formatMoney } from '../store/shop';
import { ui } from '../theme';

export default function CheckoutScreen() {
  const account = useAccount();
  if (!commerceEnabled) return <View style={[ui.screen, { padding: 20 }]}><EmptyState title="Buyurtma xizmati tayyorlanmoqda" message="Katalog va savatdan foydalanishingiz mumkin. Buyurtma serveri hali ishga tushirilmagan." /></View>;
  if (!account.user) return <View style={[ui.screen, { padding: 20 }]}><EmptyState title="Hisobingizga kiring" message="Buyurtma tarixi va holatini saqlash uchun hisob kerak." action={{ label: 'Profilga o‘tish', onPress: () => router.navigate('/profile') }} /></View>;
  return <CheckoutForm key={account.user.uid} />;
}

function CheckoutForm() {
  const { state, dispatch } = useShop();
  const account = useAccount();
  const settings = useCommerceSettings();
  const uid = account.user?.uid;
  const [customer, setCustomer] = useState({ name: account.profile.name, phone: account.profile.phone, address: account.profile.address });
  const [delivery, setDelivery] = useState<'pickup' | 'courier'>('pickup');
  const [note, setNote] = useState('');
  const [useCashback, setUseCashback] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const lock = useRef(false);
  const [pending, setPending] = useState<CheckoutInput | null>(null);
  const [pendingLoaded, setPendingLoaded] = useState(false);
  const [pendingProblem, setPendingProblem] = useState(false);
  const [readAttempt, setReadAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    if (!uid) return;
    void readLocal<CheckoutInput>('attempt:' + uid).then((value) => {
      if (active) { setPending(value?.attemptId && Array.isArray(value.items) ? value : null); setPendingLoaded(true); }
    }).catch(() => { if (active) { setMessage('Oldingi buyurtma holatini telefon xotirasidan o‘qib bo‘lmadi. Qayta tekshiring.'); setPendingProblem(true); } });
    return () => { active = false; };
  }, [uid, readAttempt]);
  const summary = cartSummary(state);
  const shipping = delivery === 'courier' ? settings.shippingFee : 0;
  const discount = useCashback ? Math.min(Math.max(0, account.balance), Math.floor(summary.total * 0.2)) : 0;
  async function submit(recover = false) {
    if (lock.current || !account.user || !pendingLoaded) return;
    lock.current = true; setBusy(true); setMessage('');
    const key = 'attempt:' + account.user.uid;
    try {
      await account.user.reload();
      if (!account.user.emailVerified) { setMessage('Avval emailingizga kelgan havola orqali hisobni tasdiqlang.'); return; }
      await account.user.getIdToken(true);
      const input: CheckoutInput = recover && pending ? pending : {
        attemptId: Date.now().toString(36) + Math.random().toString(36).slice(2, 14),
        items: cartLines(state).map((p) => ({ id: p.id, quantity: p.quantity })).sort((a, b) => a.id.localeCompare(b.id)),
        customer, delivery, note, useCashback, expectedTotal: summary.total + shipping - discount,
      };
      // Never create a second attempt while a timed-out request is unresolved.
      if (pending && !recover) return;
      await saveLocal(key, input);
      setPending(input);
      const result = await createOrder(input);
      // The server has acknowledged this exact attempt. Retire it before allowing
      // another identical cart to become a new order.
      await saveLocal(key, null);
      setPending(null);
      dispatch({ type: 'ordered', quantities: Object.fromEntries(input.items.map((p) => [p.id, p.quantity])) });
      router.replace({ pathname: '/order/[uid]/[id]', params: result.data });
    } catch (e) {
      const code = (e as { code?: string }).code ?? '';
      if (['functions/invalid-argument', 'functions/failed-precondition', 'functions/permission-denied', 'functions/resource-exhausted', 'functions/unauthenticated'].includes(code)) {
        try { await saveLocal(key, null); setPending(null); } catch { /* Keep recovery available if persistence fails. */ }
      }
      setMessage(errorMessage(e));
    } finally { lock.current = false; setBusy(false); }
  }
  if (!summary.count && !busy && !pending && pendingLoaded) return <View style={[ui.screen, { padding: 20 }]}><EmptyState title="Savat bo‘sh" message="Avval mahsulot tanlang." action={{ label: 'Katalogga', onPress: () => router.navigate('/') }} /></View>;
  return <SafeAreaView style={ui.screen} edges={['bottom', 'left', 'right']}><KeyboardAvoidingView style={ui.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 18 }}>
      {pending && <View style={ui.card}><Text style={ui.name}>Oldingi buyurtma javobi kutilmoqda</Text><Text style={ui.secondary}>Holatini tekshirish o‘sha buyurtmani qayta ochadi. Yangi buyurtma yaratilmaydi.</Text><ActionButton label={busy ? 'Tekshirilmoqda…' : 'Buyurtma holatini tekshirish'} disabled={busy} onPress={() => void submit(true)} /></View>}
      <Text style={ui.name}>Qabul qiluvchi</Text>
      <Field label="Ism va familiya" value={customer.name} maxLength={80} editable={!busy} onChangeText={(name) => setCustomer({ ...customer, name })} />
      <Field label="Telefon" value={customer.phone} placeholder="+998 90 123 45 67" maxLength={24} keyboardType="phone-pad" editable={!busy} onChangeText={(phone) => setCustomer({ ...customer, phone })} />
      <Text style={ui.name}>Qabul qilish usuli</Text>
      <View style={ui.row}><Pill text="Do‘kondan olish" selected={delivery === 'pickup'} onPress={() => { if (!busy) setDelivery('pickup'); }} />
        {settings.courierEnabled && <Pill text="Yetkazib berish" selected={delivery === 'courier'} onPress={() => { if (!busy) setDelivery('courier'); }} />}</View>
      {delivery === 'courier' && <Field label="To‘liq manzil" value={customer.address} maxLength={300} multiline editable={!busy} onChangeText={(address) => setCustomer({ ...customer, address })} />}
      <Field label="Izoh (ixtiyoriy)" value={note} onChangeText={setNote} maxLength={500} multiline editable={!busy} />
      <View style={ui.card}><Text style={ui.name}>To‘lov — naqd</Text><Text style={ui.secondary}>Mahsulotni olganingizda to‘laysiz.</Text>
        {account.balance > 0 && <View style={ui.row}><Text style={[ui.secondary, { flex: 1 }]}>Cashback ishlatish (20% gacha)</Text><Switch accessibilityLabel="Cashback ishlatish" value={useCashback} disabled={busy} onValueChange={setUseCashback} /></View>}
        <Text style={ui.secondary}>{summary.count} dona · {formatMoney(summary.total)}</Text>
        <Text style={ui.secondary}>Yetkazish: {formatMoney(shipping)}</Text>
        {discount > 0 && <Text style={ui.secondary}>Cashback: −{formatMoney(discount)}</Text>}
        <Text style={ui.price}>Jami: {formatMoney(summary.total + shipping - discount)}</Text>
      </View>
      <ConnectionStatus /><Message text={message} />
      {pendingProblem && <ActionButton label="Xotirani qayta tekshirish" onPress={() => { setPendingLoaded(false); setPendingProblem(false); setReadAttempt((n) => n + 1); }} />}
      <ActionButton label={busy ? 'Buyurtma yuborilmoqda…' : 'Buyurtmani tasdiqlash'} disabled={busy || !summary.count || !!pending || !pendingLoaded || state.status !== 'ready' || customer.name.trim().length < 2 || customer.phone.replace(/\D/g, '').length < 9 || (delivery === 'courier' && customer.address.trim().length < 8)} onPress={() => void submit()} />
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
