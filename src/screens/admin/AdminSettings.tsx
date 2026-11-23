import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAdminShell } from '../../components/admin/AdminShell';
import { BottomBar, barButton } from '../../components/ui/BottomBar';
import { Button } from '../../components/ui/Button';
import { Card, SwitchRow } from '../../components/ui/Controls';
import { Field, PhoneField } from '../../components/ui/Field';
import { goBack, Header } from '../../components/ui/Header';
import { Txt } from '../../components/ui/Txt';
import { legalErrors, readMediaKey, type ShopSettings } from '../../domain/content';
import { useT } from '../../i18n';
import { haptic } from '../../lib/haptics';
import { saveMediaKey, saveSettings, useMediaKey } from '../../state/admin';
import { useSettings } from '../../state/catalog';
import { showToast } from '../../state/toast';
import { colors, layout } from '../../theme/tokens';

export default function AdminSettings() {
  const current = useSettings();
  const media = useMediaKey();
  return <Form key={JSON.stringify(current) + media.key} initial={current} initialKey={media.key} secure={media.secure} />;
}

function Form({ initial, initialKey, secure }: { initial: ShopSettings; initialKey: string; secure: boolean }) {
  const insets = useSafeAreaInsets();
  const { t, money } = useT();
  const { sidebar } = useAdminShell();
  const { width } = useWindowDimensions();
  const wide = width >= layout.wide;
  const [s, setS] = useState(initial);
  const [key, setKey] = useState(initialKey);
  const [coords, setCoords] = useState(initial.lat != null && initial.lng != null ? `${initial.lat}, ${initial.lng}` : '');
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const set = (patch: Partial<ShopSettings>) => setS((x) => ({ ...x, ...patch }));
  const num = (v: string) => parseInt(v.replace(/\D/g, '') || '0', 10);
  const digits = (v: string) => v.replace(/\D/g, '');
  const keyError = key && !readMediaKey(key) ? t('admin.settings.mediaKeyBad') : null;
  const legal = legalErrors(s);
  // Xato faqat «Saqlash» bosilgandan keyin ko'rsatiladi — raqam yozilayotganda qizarib turmaydi.
  const err = (k: keyof typeof legal, text: string) => (touched && legal[k] ? text : null);
  const save = async () => {
    setTouched(true);
    if (keyError) { showToast(keyError, { kind: 'error' }); return; }
    if (Object.keys(legal).length) { haptic.warning(); showToast(t('admin.settings.fixErrors'), { kind: 'error' }); return; }
    const m = coords.match(/(-?\d{1,2}\.\d+)\s*[,; ]\s*(-?\d{1,3}\.\d+)/);
    setBusy(true);
    try {
      await saveSettings({ ...s, lat: m ? parseFloat(m[1]) : null, lng: m ? parseFloat(m[2]) : null });
    } catch {
      showToast(t('admin.err.permission'), { kind: 'error' });
      setBusy(false);
      return;
    }
    try {
      if (key !== initialKey) await saveMediaKey(key);
      haptic.success();
      showToast(t('admin.settings.saved'), { kind: 'success' });
      goBack('/admin');
    } catch {
      // Yangi qoidalar joylanmagan bo'lsa, kalitni yashirin joyga yozib bo'lmaydi.
      showToast(t('admin.settings.mediaInsecure'), { kind: 'error', duration: 5000 });
    } finally {
      setBusy(false);
    }
  };

  const shop = (
    <View style={[styles.section, wide && styles.sectionWide]}>
      <Txt variant="h3">{t('admin.settings.shop')}</Txt>
      <Card style={styles.gap}>
        <Field label={t('admin.settings.name')} value={s.name} onChangeText={(v) => set({ name: v })} maxLength={60} />
        <PhoneField label={t('admin.settings.phone')} value={s.phone} onChange={(v) => set({ phone: v })} />
        <PhoneField label={t('admin.settings.phone2')} value={s.phone2} onChange={(v) => set({ phone2: v })} />
        <Field label={t('admin.settings.telegram')} value={s.telegram} onChangeText={(v) => set({ telegram: v.trim() })} autoCapitalize="none" placeholder="optovik_n99" />
        <Field label={t('admin.settings.instagram')} value={s.instagram} onChangeText={(v) => set({ instagram: v.trim() })} autoCapitalize="none" />
        <Field label={t('admin.settings.address')} value={s.address} onChangeText={(v) => set({ address: v })} multiline maxLength={300} />
        <Field label={t('admin.settings.landmark')} value={s.landmark} onChangeText={(v) => set({ landmark: v })} maxLength={300} />
        <Field label={t('admin.settings.hours')} value={s.workHours} onChangeText={(v) => set({ workHours: v })} maxLength={60} />
        <Field label={t('admin.settings.coords')} value={coords} onChangeText={setCoords} hint={t('admin.settings.coordsHint')} keyboardType="numbers-and-punctuation" />
      </Card>
    </View>
  );

  const rest = (
    <View style={[styles.section, wide && styles.sectionWide]}>
      <Txt variant="h3">{t('admin.settings.delivery')}</Txt>
      <Card style={styles.gap}>
        <SwitchRow title={t('admin.settings.pickupEnabled')} value={s.pickupEnabled} onChange={(v) => set({ pickupEnabled: v })} />
        <SwitchRow title={t('admin.settings.courierEnabled')} value={s.courierEnabled} onChange={(v) => set({ courierEnabled: v })} />
        <Field label={t('admin.settings.courierFee')} value={String(s.courierFee)} onChangeText={(v) => set({ courierFee: num(v) })} keyboardType="number-pad" hint={s.courierFee ? money(s.courierFee) : undefined} />
        <Field label={t('admin.settings.freeFrom')} value={String(s.freeDeliveryFrom)} onChangeText={(v) => set({ freeDeliveryFrom: num(v) })} keyboardType="number-pad" hint={s.freeDeliveryFrom ? money(s.freeDeliveryFrom) : undefined} />
        <Field label={t('admin.settings.deliveryNote')} value={s.deliveryNote} onChangeText={(v) => set({ deliveryNote: v })} maxLength={300} multiline />
      </Card>

      <Txt variant="h3">{t('admin.settings.legal')}</Txt>
      <Card style={styles.gap}>
        <Txt variant="small">{t('admin.settings.legalHint')}</Txt>
        <Field label={t('admin.settings.legalName')} value={s.legalName} onChangeText={(v) => set({ legalName: v })} maxLength={120}
          placeholder={t('admin.settings.legalNamePh')} />
        <Field label={t('admin.settings.inn')} value={s.inn} onChangeText={(v) => set({ inn: digits(v) })} keyboardType="number-pad" maxLength={14}
          error={err('inn', t('admin.settings.digits', { n: 9 }))} />
        <Field label={t('admin.settings.legalAddress')} value={s.legalAddress} onChangeText={(v) => set({ legalAddress: v })} maxLength={300} multiline />
        <Field label={t('admin.settings.director')} value={s.director} onChangeText={(v) => set({ director: v })} maxLength={120} />
        <Field label={t('admin.settings.bankName')} value={s.bankName} onChangeText={(v) => set({ bankName: v })} maxLength={160} />
        <Field label={t('admin.settings.bankAccount')} value={s.bankAccount} onChangeText={(v) => set({ bankAccount: digits(v) })} keyboardType="number-pad" maxLength={20}
          hint={t('admin.settings.bankAccountHint')} error={err('bankAccount', t('admin.settings.digits', { n: 20 }))} />
        <Field label={t('admin.settings.bankMfo')} value={s.bankMfo} onChangeText={(v) => set({ bankMfo: digits(v) })} keyboardType="number-pad" maxLength={5}
          error={err('bankMfo', t('admin.settings.digits', { n: 5 }))} />
        <Field label={t('admin.settings.email')} value={s.email} onChangeText={(v) => set({ email: v.trim() })} keyboardType="email-address" autoCapitalize="none" autoCorrect={false}
          maxLength={120} placeholder="info@example.uz" error={err('email', t('admin.settings.emailBad'))} />
        <Button title={t('admin.settings.openOferta')} icon="document-text-outline" variant="secondary" size="sm"
          onPress={() => router.push({ pathname: '/info/[page]', params: { page: 'oferta' } })} />
      </Card>

      <Txt variant="h3">{t('admin.settings.receipt')}</Txt>
      <Card style={styles.gap}>
        <Txt variant="small">{t('admin.settings.receiptHint')}</Txt>
        <Field label={t('admin.settings.mxik')} value={s.mxik} onChangeText={(v) => set({ mxik: digits(v) })} keyboardType="number-pad" maxLength={17}
          error={err('mxik', t('admin.settings.digits', { n: 17 }))} />
        <Field label={t('admin.settings.packageCode')} value={s.packageCode} onChangeText={(v) => set({ packageCode: digits(v) })} keyboardType="number-pad" maxLength={10} />
        <Field label={t('admin.settings.vat')} value={String(s.vatPercent)} onChangeText={(v) => set({ vatPercent: Math.min(30, num(v)) })} keyboardType="number-pad" maxLength={2}
          hint={t('admin.settings.vatHint')} />
      </Card>

      <Txt variant="h3">{t('admin.settings.media')}</Txt>
      <Card style={styles.gap}>
        <Txt variant="small">{t('admin.settings.mediaHint')}</Txt>
        <Field label={t('admin.settings.mediaKey')} value={key} onChangeText={(v) => setKey(v.trim())} autoCapitalize="none" autoCorrect={false}
          placeholder="a1b2c3d4e5f6…" error={keyError} />
        {!secure ? <Txt variant="smallStrong" color={colors.warning}>{t('admin.settings.mediaInsecure')}</Txt> : null}
      </Card>
    </View>
  );

  return (
    <View style={styles.root}>
      <Header title={t('admin.settings')} back={!sidebar} />
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <ScrollView contentContainerStyle={[styles.body, wide && styles.bodyWide, { paddingBottom: insets.bottom + 110 }]} keyboardShouldPersistTaps="handled">
          {wide ? <View style={styles.columns}>{shop}{rest}</View> : <>{shop}{rest}</>}
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomBar wide={wide}>
        <Button title={t('common.save')} size="lg" loading={busy} onPress={save} full={!wide} style={wide ? barButton : undefined} />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 12, width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center' },
  bodyWide: { maxWidth: layout.wideMaxWidth, padding: 24 },
  columns: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  section: { gap: 12 },
  sectionWide: { flex: 1, minWidth: 0 },
  gap: { gap: 12 },
});
