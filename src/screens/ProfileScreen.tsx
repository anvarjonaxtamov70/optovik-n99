import { router } from 'expo-router';
import { createUserWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, ScreenHeader } from '../components/ShopUI';
import { Field, Message } from '../components/StoreUI';
import { auth, commerceEnabled, errorMessage } from '../lib/firebase';
import { useAccount } from '../store/AccountProvider';
import { formatMoney } from '../store/shop';
import { colors, ui } from '../theme';

export default function ProfileScreen() {
  const account = useAccount();
  const [draft, setDraft] = useState(account.profile);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => setDraft(account.profile), [account.profile]);
  async function run(action: () => Promise<unknown>, success = '') {
    setBusy(true); setMessage('');
    try { await action(); setPassword(''); setMessage(success); } catch (e) { setMessage(errorMessage(e)); }
    finally { setBusy(false); }
  }
  const canLogin = commerceEnabled && account.ready && !busy && !!email.trim() && password.length >= 8;
  return <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}><KeyboardAvoidingView style={ui.body} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 18 }}>
      <ScreenHeader inset={false} title="Shaxsiy kabinet" subtitle="Profil, manzillar va buyurtmalaringiz" />
      {!commerceEnabled && <Message text="Katalog va savat ishlaydi. Hisob va buyurtma xizmati server sozlangach ochiladi." />}
      <Message text={message || account.problem} />
      {account.user ? <>
        <View style={ui.card}><Text style={ui.name}>{account.user.email}</Text><Text style={ui.secondary}>{account.user.emailVerified ? 'Email tasdiqlangan' : 'Emailingizdagi tasdiqlash havolasini oching.'}</Text>
          {!account.user.emailVerified && <ActionButton disabled={busy} label="Tasdiqlash xatini yuborish" onPress={() => void run(() => sendEmailVerification(account.user!), 'Tasdiqlash xati yuborildi.')} />}
          {!account.user.emailVerified && <ActionButton disabled={busy} label="Tasdiqlashni tekshirish" onPress={() => void run(async () => { await account.user!.reload(); await account.user!.getIdToken(true); }, 'Hisob holati yangilandi.')} />}
          <Text style={ui.secondary}>Cashback balansi</Text><Text style={ui.price}>{formatMoney(account.balance)}</Text>
        </View>
        <ActionButton label="Buyurtmalarim" onPress={() => router.push('/orders')} />
        {account.admin && <ActionButton label="Do‘konni boshqarish" onPress={() => router.push('/admin')} />}
        <View style={ui.card}><Text style={ui.name}>Mening ma’lumotlarim</Text>
          <Field label="Ism va familiya" value={draft.name} maxLength={80} onChangeText={(name) => setDraft({ ...draft, name })} />
          <Field label="Telefon" value={draft.phone} keyboardType="phone-pad" placeholder="+998 90 123 45 67" maxLength={24} onChangeText={(phone) => setDraft({ ...draft, phone })} />
          <Field label="Yetkazish manzili" value={draft.address} maxLength={300} multiline onChangeText={(address) => setDraft({ ...draft, address })} />
          <Field label="Avtomobil modeli" value={draft.car} maxLength={80} onChangeText={(car) => setDraft({ ...draft, car })} />
          <ActionButton label={busy ? 'Saqlanmoqda…' : 'Saqlash'} disabled={busy || !commerceEnabled} onPress={() => void run(() => account.saveProfile(draft), 'Profil saqlandi.')} />
        </View>
        <ActionButton label="Hisobdan chiqish" disabled={busy} onPress={() => void run(() => signOut(auth))} />
      </> : <View style={ui.card}>
        <Text style={ui.name}>Hisobingizga kiring</Text><Text style={ui.secondary}>Buyurtmalar va cashback boshqa telefonda ham saqlanadi.</Text>
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" maxLength={160} />
        <Field label="Parol" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="current-password" maxLength={128} />
        <ActionButton label={busy ? 'Kutilmoqda…' : 'Kirish'} disabled={!canLogin} onPress={() => void run(() => signInWithEmailAndPassword(auth, email.trim(), password))} />
        <ActionButton label="Yangi hisob yaratish" disabled={!canLogin} onPress={() => void run(async () => { const result = await createUserWithEmailAndPassword(auth, email.trim(), password); await sendEmailVerification(result.user); }, 'Emailingizga tasdiqlash xati yuborildi.')} />
        <ActionButton label="Parolni tiklash" disabled={busy || !commerceEnabled || !email.trim()} onPress={() => void run(() => sendPasswordResetEmail(auth, email.trim()), 'Hisob mavjud bo‘lsa, tiklash xati emailingizga keladi.')} />
      </View>}
      <View style={[ui.card, { backgroundColor: colors.blueLight }]}><Text style={ui.name}>OPTOVIK N99</Text><Text style={ui.secondary}>Ehtiyot qismlar do‘koni. Buyurtma holatini shu ilovada kuzating. To‘lov — mahsulotni olganda naqd.</Text></View>
    </ScrollView>
  </KeyboardAvoidingView></SafeAreaView>;
}
