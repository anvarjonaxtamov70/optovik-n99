import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Controls';
import { Field, PhoneField } from '../components/ui/Field';
import { FormScroll } from '../components/ui/FormScroll';
import { goBack, Header } from '../components/ui/Header';
import { Icon } from '../components/ui/Icon';
import { Txt } from '../components/ui/Txt';
import { isValidUzPhone } from '../domain/phone';
import { useT } from '../i18n';
import { haptic } from '../lib/haptics';
import { saveProfile, useProfile } from '../state/account';
import { showToast } from '../state/toast';
import { colors } from '../theme/tokens';

export default function ProfileEditScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const profile = useProfile();
  const [form, setForm] = useState(profile);
  const [busy, setBusy] = useState(false);
  const [touched, setTouched] = useState(false);
  const phoneBad = !!form.phone && !isValidUzPhone(form.phone);
  const nameBad = !!form.name && form.name.trim().length < 2;
  const save = async () => {
    setTouched(true);
    if (phoneBad || nameBad) { haptic.warning(); return; }
    setBusy(true);
    // Manzil matni o'zgargan bo'lsa, eski xaritadagi nuqta endi to'g'ri emas — u tashlanadi.
    const moved = form.address.trim() !== profile.address.trim();
    await saveProfile(moved ? { ...form, lat: null, lng: null } : form);
    setBusy(false);
    haptic.success();
    showToast(t('edit.saved'), { kind: 'success' });
    goBack('/profile');
  };
  return (
    <View style={styles.root}>
      <Header title={t('edit.title')} />
      <FormScroll contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
          <Card style={styles.gap}>
            <Field label={t('edit.name')} icon="person-outline" value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} maxLength={80}
              error={touched && nameBad ? t('checkout.err.short') : null} autoComplete="name" textContentType="name" />
            <PhoneField label={t('edit.phone')} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} error={touched && phoneBad ? t('checkout.err.phone') : null} />
            <Field label={t('edit.address')} icon="location-outline" value={form.address} onChangeText={(v) => setForm((f) => ({ ...f, address: v }))} maxLength={300} placeholder={t('checkout.addressPh')} />
            <Field label={t('address.apartment')} icon="business-outline" value={form.apartment} onChangeText={(v) => setForm((f) => ({ ...f, apartment: v }))} maxLength={80} placeholder={t('address.apartmentPh')} />
            <Field label={t('edit.landmark')} icon="flag-outline" value={form.landmark} onChangeText={(v) => setForm((f) => ({ ...f, landmark: v }))} maxLength={200} placeholder={t('checkout.landmarkPh')} />
          </Card>
          <View style={styles.note}>
            <Icon name="lock-closed-outline" size={16} color={colors.faint} />
            <Txt variant="tiny" style={styles.flex}>{t('edit.localNote')}</Txt>
          </View>
          <Button title={t('common.save')} size="lg" loading={busy} onPress={save} />
      </FormScroll>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: 16, gap: 14, width: '100%', maxWidth: 760, alignSelf: 'center' },
  gap: { gap: 14 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4 },
});
