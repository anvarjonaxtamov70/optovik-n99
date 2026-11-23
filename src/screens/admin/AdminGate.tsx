import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { ADMIN_WIDE, AdminShellProvider, AdminSidebar } from '../../components/admin/AdminShell';
import { LogoMark } from '../../components/brand/Logo';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Controls';
import { Field } from '../../components/ui/Field';
import { Header } from '../../components/ui/Header';
import { Txt } from '../../components/ui/Txt';
import { orderNumber } from '../../domain/order';
import { useT } from '../../i18n';
import { classifyError } from '../../lib/firebase';
import { haptic } from '../../lib/haptics';
import { adminSignIn, adminSignOut, useAccount } from '../../state/account';
import { migrateMediaKey, watchMediaKey } from '../../state/admin';
import { useAdminOrders } from '../../state/orders';
import { showToast } from '../../state/toast';
import { colors } from '../../theme/tokens';

/** Admin bo'limi: kirish → ruxsat tekshiruvi → admin sahifalari. */
export default function AdminGate() {
  const account = useAccount();
  if (!account.ready) return <Loading />;
  if (!account.uid || account.anonymous) return <AdminLogin />;
  if (!account.adminChecked) return <Loading />;
  if (!account.admin) return <NotAdmin uid={account.uid} email={account.email} />;
  return <AdminShell />;
}

/** Kompyuterda — chap menyu + sahifa, telefonda — oddiy sahifalar ketma-ketligi. */
function AdminShell() {
  const { width } = useWindowDimensions();
  const sidebar = IS_WEB && width >= ADMIN_WIDE;
  const shell = useMemo(() => ({ sidebar }), [sidebar]);
  return (
    <AdminShellProvider value={shell}>
      <View style={styles.shell}>
        {sidebar ? <AdminSidebar /> : null}
        <View style={styles.page}>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: sidebar ? 'none' : 'slide_from_right' }} />
        </View>
      </View>
      <NewOrderWatcher />
      <MediaKeyWatcher />
    </AdminShellProvider>
  );
}

/** Rasm yuklash kalitini kuzatadi va eski ochiq joyda qolgan bo'lsa, yashirin joyga ko'chiradi. */
function MediaKeyWatcher() {
  useEffect(() => {
    const off = watchMediaKey();
    void migrateMediaKey().catch(() => {}); // qoidalar hali yangilanmagan bo'lsa — keyingi safar
    return off;
  }, []);
  return null;
}

function Loading() {
  return <View style={[styles.root, styles.center]}><ActivityIndicator color={colors.primary} size="large" /></View>;
}

function AdminLogin() {
  const { t } = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminSignIn(email, password);
      haptic.success();
    } catch (e) {
      haptic.warning();
      const kind = classifyError(e);
      setError(kind === 'bad-login' ? t('admin.badLogin') : kind === 'auth-disabled' ? t('checkout.err.auth') : kind === 'network' ? t('checkout.err.network') : t('common.error'));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.root}>
      <Header title={t('admin.title')} back={!IS_WEB} />
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <View style={styles.center}><LogoMark size={76} /></View>
          <Txt variant="h2" center>{t('admin.login')}</Txt>
          <Txt variant="small" center>{t('admin.loginText')}</Txt>
          <Card style={styles.gap}>
            <Field label={t('admin.email')} icon="mail-outline" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" textContentType="username" />
            <Field label={t('admin.password')} icon="key-outline" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" textContentType="password" onSubmitEditing={submit} />
            {error ? <Txt variant="smallStrong" color={colors.sale}>{error}</Txt> : null}
            <Button title={t('admin.signIn')} loading={busy} disabled={!email.includes('@') || password.length < 6} onPress={submit} size="lg" />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function NotAdmin({ uid, email }: { uid: string; email: string | null }) {
  const { t } = useT();
  return (
    <View style={styles.root}>
      <Header title={t('admin.title')} back={!IS_WEB} />
      <ScrollView contentContainerStyle={styles.body}>
        <Txt variant="h2" center>{t('admin.notAdmin')}</Txt>
        <Txt variant="body" center color={colors.muted}>{t('admin.notAdminText')}</Txt>
        <Card style={styles.gap}>
          {email ? <Txt variant="small">{email}</Txt> : null}
          <Txt variant="label">{t('admin.uid')}</Txt>
          <Txt variant="bodyStrong" selectable>{uid}</Txt>
          <Button title={t('common.copy')} icon="copy-outline" variant="secondary" onPress={async () => { await Clipboard.setStringAsync(uid); showToast(t('common.copied'), { kind: 'success' }); }} />
        </Card>
        <Button title={t('admin.signOut')} variant="ghost" onPress={() => void adminSignOut()} />
      </ScrollView>
    </View>
  );
}

/** Admin ilovada turganida yangi buyurtma kelsa — xabar va tebranish. */
function NewOrderWatcher() {
  const { orders } = useAdminOrders(20);
  const { t } = useT();
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!orders.length && !seen.current) return;
    if (!seen.current) { seen.current = new Set(orders.map((o) => o.id)); return; }
    for (const o of orders) {
      if (!seen.current.has(o.id)) {
        seen.current.add(o.id);
        if (o.holat === 'yangi') { haptic.success(); showToast(t('admin.liveNew', { num: orderNumber(o.raqam) }), { kind: 'success', icon: 'notifications' }); }
      }
    }
  }, [orders, t]);
  return null;
}

const IS_WEB = Platform.OS === 'web';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  shell: { flex: 1, flexDirection: 'row', backgroundColor: colors.bg },
  page: { flex: 1, minWidth: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  gap: { gap: 12 },
});
