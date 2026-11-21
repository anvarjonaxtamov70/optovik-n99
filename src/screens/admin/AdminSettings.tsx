import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../../components/ui/Button';
import { Card, SwitchRow } from '../../components/ui/Controls';
import { Field, PhoneField } from '../../components/ui/Field';
import { goBack, Header } from '../../components/ui/Header';
import { Txt } from '../../components/ui/Txt';
import { readMediaKey, type ShopSettings } from '../../domain/content';
import { useT } from '../../i18n';
import { haptic } from '../../lib/haptics';
import { saveMediaKey, saveSettings, useMediaKey } from '../../state/admin';
import { useSettings } from '../../state/catalog';
import { showToast } from '../../state/toast';
import { colors } from '../../theme/tokens';

export default function AdminSettings() {
  const current = useSettings();
  const media = useMediaKey();
  return <Form key={JSON.stringify(current) + media.key} initial={current} initialKey={media.key} secure={media.secure} />;
}

function Form({ initial, initialKey, secure }: { initial: ShopSettings; initialKey: string; secure: boolean }) {
  const insets = useSafeAreaInsets();
  const { t, money } = useT();
  const [s, setS] = useState(initial);
  const [key, setKey] = useState(initialKey);
  const [coords, setCoords] = useState(initial.lat != null && initial.lng != null ? `${initial.lat}, ${initial.lng}` : '');
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<ShopSettings>) => setS((x) => ({ ...x, ...patch }));
  const num = (v: string) => parseInt(v.replace(/\D/g, '') || '0', 10);
  const keyError = key && !readMediaKey(key) ? t('admin.settings.mediaKeyBad') : null;
  const save = async () => {
    if (keyError) { showToast(keyError, { kind: 'error' }); return; }
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
  return (
    <View style={styles.root}>
      <Header title={t('admin.settings')} />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]} keyboardShouldPersistTaps="handled">
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
            <Field label={t('admin.settings.legalName')} value={s.legalName} onChangeText={(v) => set({ legalName: v })} maxLength={120} placeholder="«OPTOVIK N99» MCHJ" />
            <Field label={t('admin.settings.inn')} value={s.inn} onChangeText={(v) => set({ inn: v.replace(/\D/g, '') })} keyboardType="number-pad" maxLength={14} />
          </Card>

          <Txt variant="h3">{t('admin.settings.media')}</Txt>
          <Card style={styles.gap}>
            <Txt variant="small">{t('admin.settings.mediaHint')}</Txt>
            <Field label={t('admin.settings.mediaKey')} value={key} onChangeText={(v) => setKey(v.trim())} autoCapitalize="none" autoCorrect={false}
              placeholder="a1b2c3d4e5f6…" error={keyError} />
            {!secure ? <Txt variant="smallStrong" color={colors.warning}>{t('admin.settings.mediaInsecure')}</Txt> : null}
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title={t('common.save')} size="lg" loading={busy} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  gap: { gap: 12 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 12, backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
