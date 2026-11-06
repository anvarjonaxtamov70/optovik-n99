import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Notice } from '../components/shop/CatalogBits';
import { ProductImage } from '../components/shop/ProductImage';
import { Button } from '../components/ui/Button';
import { Card, Pill, Radio, Segmented } from '../components/ui/Controls';
import { Field, PhoneField } from '../components/ui/Field';
import { Header } from '../components/ui/Header';
import { Icon, PartIcon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { Txt } from '../components/ui/Txt';
import type { DeliveryKind } from '../domain/cart';
import { validateCheckout, type CheckoutForm } from '../domain/order';
import { useT, type TKey } from '../i18n';
import { haptic } from '../lib/haptics';
import { openMap } from '../lib/links';
import { saveProfile, useAccount, useProfile } from '../state/account';
import { cart, useCart } from '../state/cart';
import { useCatalogLive, useSettings } from '../state/catalog';
import { PlaceOrderError, placeOrder } from '../state/orders';
import { showToast } from '../state/toast';
import { colors, radius, shadow } from '../theme/tokens';

export default function CheckoutScreen() {
  const insets = useSafeAreaInsets();
  const { t, money, lang } = useT();
  const settings = useSettings();
  const profile = useProfile();
  const authProblem = useAccount().problem === 'auth-disabled';
  const live = useCatalogLive();
  const courierOk = settings.courierEnabled;
  const pickupOk = settings.pickupEnabled || !courierOk;
  const [kind, setKind] = useState<DeliveryKind>(pickupOk ? 'olib' : 'kuryer');
  const { lines, summary } = useCart(kind);
  const [form, setForm] = useState<CheckoutForm>({ ism: profile.name, telefon: profile.phone, turi: kind, manzil: profile.address, moljal: profile.landmark, izoh: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (!done.current && summary.lines === 0 && !busy) router.back();
  }, [summary.lines, busy]);

  const order: CheckoutForm = { ...form, turi: kind };
  const errors = validateCheckout(order);
  const shown = touched ? errors : {};
  const errText = (k?: string) => (k ? t(`checkout.err.${k}` as TKey) : null);
  const set = (patch: Partial<CheckoutForm>) => setForm((f) => ({ ...f, ...patch }));
  const deliveryLabel = kind === 'olib' ? t('checkout.free') : summary.delivery ? money(summary.delivery) : summary.freeLeft === 0 && settings.freeDeliveryFrom ? t('checkout.free') : t('checkout.byAgreement');

  const submit = async () => {
    setTouched(true);
    setError(null);
    if (Object.keys(errors).length) { haptic.warning(); return; }
    setBusy(true);
    try {
      const ordered = Object.fromEntries(lines.filter((l) => l.selected && l.product).map((l) => [l.id, Math.min(l.qty, l.product!.qoldiq)]));
      const res = await placeOrder(lines, summary, order, lang);
      done.current = true;
      haptic.success();
      void saveProfile({ name: form.ism, phone: form.telefon, address: form.manzil || profile.address, landmark: form.moljal || profile.landmark });
      cart.ordered(ordered);
      router.replace({ pathname: '/order-success', params: { id: res.id, raqam: String(res.raqam), phone: form.telefon } });
    } catch (e) {
      haptic.warning();
      const reason = e instanceof PlaceOrderError ? e.reason : 'unknown';
      const msg = reason === 'auth' ? t('checkout.err.auth') : reason === 'rules' ? t('checkout.err.rules') : reason === 'rate' ? t('checkout.err.rate')
        : reason === 'network' ? t('checkout.err.network') : reason === 'empty' ? t('checkout.err.empty') : t('common.error');
      setError(msg);
      showToast(msg, { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Header title={t('checkout.title')} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 130 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          {authProblem ? <View style={styles.noticeWrap}><Notice icon="alert-circle-outline" tone="warning" text={t('checkout.err.auth')} /></View> : null}
          <Step n={1} title={t('checkout.method')}>
            {courierOk && pickupOk ? (
              <Segmented value={kind} onChange={(v) => { haptic.tap(); setKind(v); }} options={[
                { value: 'olib', label: t('checkout.pickup'), icon: 'storefront-outline' },
                { value: 'kuryer', label: t('checkout.courier'), icon: 'bicycle-outline' },
              ]} />
            ) : null}
            <Animated.View key={kind} entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.gap}>
              {kind === 'olib' ? (
                <View style={styles.shop}>
                  <View style={styles.shopIcon}><PartIcon name="storefront-outline" size={24} color={colors.primary} /></View>
                  <View style={styles.flex}>
                    <Txt variant="label">{t('checkout.shopAddress')}</Txt>
                    <Txt variant="bodyStrong">{settings.address}</Txt>
                    {settings.workHours ? <Txt variant="small">{settings.workHours}</Txt> : null}
                    <PressableScale onPress={() => openMap(settings)} style={styles.mapLink} accessibilityLabel={t('checkout.openMap')}>
                      <Icon name="navigate" size={15} color={colors.primary} />
                      <Txt variant="smallStrong" color={colors.primary}>{t('checkout.openMap')}</Txt>
                    </PressableScale>
                  </View>
                </View>
              ) : (
                <>
                  <Txt variant="small">{t('checkout.courierSub')}{settings.deliveryNote ? ` · ${settings.deliveryNote}` : ''}</Txt>
                  <Field label={t('checkout.address')} icon="location-outline" placeholder={t('checkout.addressPh')} value={form.manzil} onChangeText={(v) => set({ manzil: v })}
                    error={errText(shown.manzil)} maxLength={300} autoComplete="street-address" />
                  <Field label={t('checkout.landmark')} icon="flag-outline" placeholder={t('checkout.landmarkPh')} value={form.moljal} onChangeText={(v) => set({ moljal: v })} maxLength={200} />
                </>
              )}
            </Animated.View>
          </Step>

          <Step n={2} title={t('checkout.contact')}>
            <Field label={t('checkout.name')} icon="person-outline" placeholder={t('checkout.namePh')} value={form.ism} onChangeText={(v) => set({ ism: v })}
              error={errText(shown.ism)} maxLength={80} autoComplete="name" textContentType="name" />
            <PhoneField label={t('checkout.phone')} value={form.telefon} onChange={(v) => set({ telefon: v })} error={errText(shown.telefon)} hint={t('checkout.phoneHint')} />
          </Step>

          <Step n={3} title={t('checkout.payment')}>
            <View style={[styles.pay, styles.payOn]}>
              <View style={[styles.payIcon, { backgroundColor: colors.successSoft }]}><Icon name="cash-outline" size={22} color={colors.success} /></View>
              <View style={styles.flex}>
                <Txt variant="bodyStrong">{t('checkout.cash')}</Txt>
                <Txt variant="small">{t('checkout.cashSub')}</Txt>
              </View>
              <Radio checked />
            </View>
            {['Payme', 'Click', 'Uzum Bank'].map((name) => (
              <View key={name} style={[styles.pay, styles.payOff]} accessibilityState={{ disabled: true }}>
                <View style={styles.payIcon}><Icon name="card-outline" size={20} color={colors.faint} /></View>
                <Txt variant="bodyStrong" color={colors.faint} style={styles.flex}>{name}</Txt>
                <Pill text={t('common.soon')} tone="muted" style={styles.center} />
              </View>
            ))}
          </Step>

          <Step n={4} title={t('checkout.comment')}>
            <Field placeholder={t('checkout.commentPh')} value={form.izoh} onChangeText={(v) => set({ izoh: v })} multiline maxLength={500} />
          </Step>

          <Card style={styles.summary}>
            <Txt variant="h3">{t('cart.summary')}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
              {lines.filter((l) => l.selected && l.product).map((l) => (
                <View key={l.id}>
                  <ProductImage uri={l.product!.rasmlar[0]} kategoriya={l.product!.kategoriya} seed={l.id} style={styles.thumb} iconScale={0.45} />
                  <View style={styles.qty}><Txt variant="tiny" color={colors.white}>×{Math.min(l.qty, l.product!.qoldiq)}</Txt></View>
                </View>
              ))}
            </ScrollView>
            <Line label={t('cart.goods', { n: summary.count })} value={money(summary.oldTotal)} />
            {summary.savings > 0 ? <Line label={t('cart.discount')} value={`−${money(summary.savings)}`} tone={colors.success} /> : null}
            <Line label={t('checkout.deliveryFee')} value={deliveryLabel} tone={kind === 'olib' ? colors.success : undefined} />
            <View style={styles.hr} />
            <Line label={t('cart.total')} value={money(summary.total)} strong />
            <View style={styles.remember}>
              <Icon name="shield-checkmark-outline" size={15} color={colors.faint} />
              <Txt variant="tiny" style={styles.flex}>{t('checkout.remember')}</Txt>
            </View>
          </Card>
          {error ? (
            <Animated.View entering={FadeInDown} layout={LinearTransition} style={styles.error}>
              <Icon name="alert-circle" size={20} color={colors.sale} />
              <Txt variant="smallStrong" color={colors.sale} style={styles.flex}>{error}</Txt>
            </Animated.View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.bar, shadow.float, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={styles.flex}>
          <Txt variant="tiny">{t('cart.total')}</Txt>
          <Txt variant="h2" numberOfLines={1} adjustsFontSizeToFit>{money(summary.total)}</Txt>
        </View>
        <Button title={busy ? t('checkout.placing') : t('checkout.place')} loading={busy} disabled={!live || summary.lines === 0} onPress={submit} full={false} style={styles.placeBtn} size="lg" />
      </View>
    </View>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(n * 70).duration(360)} style={[styles.step, shadow.soft]}>
      <View style={styles.stepHead}>
        <View style={styles.stepNum}><Txt variant="smallStrong" color={colors.white}>{n}</Txt></View>
        <Txt variant="h3">{title}</Txt>
      </View>
      {children}
    </Animated.View>
  );
}

function Line({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: string }) {
  return (
    <View style={styles.line}>
      <Txt variant={strong ? 'h3' : 'body'} style={styles.flex}>{label}</Txt>
      <Txt variant={strong ? 'h2' : 'bodyStrong'} color={tone}>{value}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  gap: { gap: 12 },
  center: { alignSelf: 'center' },
  noticeWrap: { marginHorizontal: -16 },
  body: { padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  step: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, gap: 12 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  shop: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.tint },
  shopIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, alignSelf: 'flex-start' },
  pay: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1.5 },
  payOn: { borderColor: colors.primary, backgroundColor: '#F7FBFF' },
  payOff: { borderColor: colors.line, backgroundColor: colors.surfaceAlt },
  payIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  summary: { gap: 10 },
  thumbs: { gap: 8, paddingVertical: 2 },
  thumb: { width: 58, height: 58, borderRadius: radius.sm },
  qty: { position: 'absolute', right: 2, bottom: 2, backgroundColor: 'rgba(15,35,56,0.8)', borderRadius: 8, paddingHorizontal: 5 },
  line: { flexDirection: 'row', alignItems: 'center' },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  error: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.saleSoft },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.white },
  placeBtn: { minWidth: 190 },
});
