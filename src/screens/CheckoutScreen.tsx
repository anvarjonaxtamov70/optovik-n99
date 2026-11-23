import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { Notice } from '../components/shop/CatalogBits';
import { ProductImage } from '../components/shop/ProductImage';
import { Button } from '../components/ui/Button';
import { Card, Pill, Radio, Segmented } from '../components/ui/Controls';
import { Field, PhoneField } from '../components/ui/Field';
import { FloatingBar, useFloatingBarSpace } from '../components/ui/FloatingBar';
import { FormScroll } from '../components/ui/FormScroll';
import { GlassFill } from '../components/ui/Glass';
import { goBack, Header } from '../components/ui/Header';
import { Icon, PartIcon } from '../components/ui/Icon';
import { PressableScale, PressOverlay } from '../components/ui/PressableScale';
import { Txt } from '../components/ui/Txt';
import type { DeliveryKind } from '../domain/cart';
import { distanceKm, formatKm, isValidLatLng } from '../domain/geo';
import { fullAddress, PAYMENTS_SOON, SHOW_SOON_PAYMENTS, validateCheckout, type CheckoutForm } from '../domain/order';
import { useT, type TKey } from '../i18n';
import { haptic } from '../lib/haptics';
import { openMap } from '../lib/links';
import { saveProfile, useAccount, useProfile } from '../state/account';
import { cart, useCart } from '../state/cart';
import { useCatalogLive, useSettings } from '../state/catalog';
import { initDeliveryDraft, useDeliveryDraft, type DeliveryDraft } from '../state/delivery';
import { PlaceOrderError, placeOrder } from '../state/orders';
import { showToast } from '../state/toast';
import { colors, fonts, radius, shadow } from '../theme/tokens';

/** Onlayn to'lov tizimlarining nomi va tanish rangi (logotip emas — faqat yozuv). */
const PAY_BRANDS: Record<(typeof PAYMENTS_SOON)[number], { name: string; color: string }> = {
  payme: { name: 'Payme', color: '#00A6B4' },
  click: { name: 'Click', color: '#0A7CFF' },
};

export default function CheckoutScreen() {
  const { t, money, lang } = useT();
  const settings = useSettings();
  const profile = useProfile();
  const authProblem = useAccount().problem === 'auth-disabled';
  const live = useCatalogLive();
  const courierOk = settings.courierEnabled;
  const pickupOk = settings.pickupEnabled || !courierOk;
  const [picked, setKind] = useState<DeliveryKind>(pickupOk ? 'olib' : 'kuryer');
  // Do'kon sozlamasi o'zgarsa (masalan, kuryer o'chirilsa) tanlangan usul ham mos ravishda almashadi.
  const kind: DeliveryKind = picked === 'kuryer' && !courierOk ? 'olib' : picked === 'olib' && !pickupOk ? 'kuryer' : picked;
  const [switched, setSwitched] = useState(false);
  const { lines, summary } = useCart(kind);
  const draft = useDeliveryDraft();
  const [contact, setContact] = useState({ ism: profile.name, telefon: profile.phone, izoh: '' });
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);
  const barSpace = useFloatingBarSpace(20);

  useEffect(() => { initDeliveryDraft(profile); }, [profile]);

  useEffect(() => {
    // Savat bo'shab qolsa — orqaga. `goBack` tarix bo'lmasa savatga olib chiqadi.
    if (!done.current && summary.lines === 0 && !busy) goBack('/cart');
  }, [summary.lines, busy]);

  const order: CheckoutForm = {
    ...contact, turi: kind, manzil: draft.manzil, xonadon: draft.xonadon, moljal: draft.moljal, lat: draft.lat, lng: draft.lng,
  };
  const errors = validateCheckout(order);
  const shown = touched ? errors : {};
  const errText = (k?: string) => (k ? t(`checkout.err.${k}` as TKey) : null);
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
      const courier = kind === 'kuryer';
      void saveProfile({
        name: contact.ism, phone: contact.telefon,
        address: courier ? draft.manzil : profile.address, apartment: courier ? draft.xonadon : profile.apartment,
        landmark: courier ? draft.moljal : profile.landmark, lat: courier ? draft.lat : profile.lat, lng: courier ? draft.lng : profile.lng,
      });
      cart.ordered(ordered);
      router.replace({ pathname: '/order-success', params: { id: res.id, raqam: String(res.raqam), phone: contact.telefon } });
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
      <FormScroll contentContainerStyle={[styles.body, { paddingBottom: barSpace }]}>
        {authProblem ? <View style={styles.noticeWrap}><Notice icon="alert-circle-outline" tone="warning" text={t('checkout.err.auth')} /></View> : null}
        <Step n={1} title={t('checkout.method')}>
          {courierOk && pickupOk ? (
            <Segmented value={kind} onChange={(v) => { haptic.tap(); setSwitched(true); setKind(v); }} options={[
              { value: 'olib', label: t('checkout.pickup'), icon: 'storefront-outline' },
              { value: 'kuryer', label: t('checkout.courier'), icon: 'bicycle-outline' },
            ]} />
          ) : null}
          {/* Faqat usul almashtirilganda yumshoq almashadi (ekran ochilganda emas). */}
          <Animated.View key={kind} entering={switched ? FadeIn.duration(200) : undefined} exiting={switched ? FadeOut.duration(110) : undefined} style={styles.gap}>
            {kind === 'olib' ? (
              <View style={styles.shop}>
                <View style={styles.shopIcon}><PartIcon name="storefront-outline" size={24} color={colors.primary} /></View>
                <View style={styles.flex}>
                  <Txt variant="label">{t('checkout.shopAddress')}</Txt>
                  <Txt variant="bodyStrong">{settings.address}</Txt>
                  {settings.workHours ? <Txt variant="small">{settings.workHours}</Txt> : null}
                  <PressableScale onPress={() => openMap(settings)} hitSlop={8} style={styles.mapLink} accessibilityLabel={t('checkout.openMap')}>
                    <Icon name="navigate" size={15} color={colors.primary} />
                    <Txt variant="smallStrong" color={colors.primary}>{t('checkout.openMap')}</Txt>
                  </PressableScale>
                </View>
              </View>
            ) : (
              <>
                <Txt variant="small">{t('checkout.courierSub')}{settings.deliveryNote ? ` · ${settings.deliveryNote}` : ''}</Txt>
                <AddressCard draft={draft} shop={settings.lat != null && settings.lng != null ? { lat: settings.lat, lng: settings.lng } : null}
                  error={errText(shown.manzil)} />
              </>
            )}
          </Animated.View>
        </Step>

        <Step n={2} title={t('checkout.contact')}>
          <Field label={t('checkout.name')} icon="person-outline" placeholder={t('checkout.namePh')} value={contact.ism} onChangeText={(v) => setContact((c) => ({ ...c, ism: v }))}
            error={errText(shown.ism)} maxLength={80} autoComplete="name" textContentType="name" />
          <PhoneField label={t('checkout.phone')} value={contact.telefon} onChange={(v) => setContact((c) => ({ ...c, telefon: v }))} error={errText(shown.telefon)} hint={t('checkout.phoneHint')} />
        </Step>

        <Step n={3} title={t('checkout.payment')}>
          <View style={[styles.pay, styles.payOn]} accessibilityRole="radio" accessibilityState={{ checked: true }} aria-checked accessibilityLabel={t('checkout.cash')}>
            <View style={[styles.payIcon, { backgroundColor: colors.successSoft }]}><Icon name="cash-outline" size={22} color={colors.success} /></View>
            <View style={styles.flex}>
              <Txt variant="bodyStrong">{t('checkout.cash')}</Txt>
              <Txt variant="small">{t('checkout.cashSub')}</Txt>
            </View>
            <Radio checked />
          </View>
          {/* Onlayn to'lov MCHJ ulangach yoqiladi; hozircha ko'rinadi, lekin tanlab bo'lmaydi. */}
          {SHOW_SOON_PAYMENTS ? PAYMENTS_SOON.map((id) => (
            <View key={id} style={[styles.pay, styles.payOff]} accessibilityRole="radio" accessibilityState={{ checked: false, disabled: true }} aria-checked={false} aria-disabled
              accessibilityLabel={`${PAY_BRANDS[id].name}, ${t('checkout.soon')}`}>
              <View style={styles.payIcon}><Txt style={[styles.brand, { color: PAY_BRANDS[id].color }]}>{PAY_BRANDS[id].name[0]}</Txt></View>
              <Txt variant="bodyStrong" color={colors.muted} style={styles.flex}>{PAY_BRANDS[id].name}</Txt>
              <Pill text={t('checkout.soon')} tone="muted" />
            </View>
          )) : null}
          {SHOW_SOON_PAYMENTS ? <Txt variant="tiny" style={styles.payNote}>{t('checkout.paySoonNote')}</Txt> : null}
        </Step>

        <Step n={4} title={t('checkout.comment')}>
          <Field placeholder={t('checkout.commentPh')} value={contact.izoh} onChangeText={(v) => setContact((c) => ({ ...c, izoh: v }))} multiline maxLength={500} />
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
          {/* Ofertani qabul qilish (aksept) — buyurtma tugmasi bosilganda. Matni har doim ochiq. */}
          <PressableScale onPress={() => router.push({ pathname: '/info/[page]', params: { page: 'oferta' } })} scaleTo={1} accessibilityRole="link"
            accessibilityLabel={`${t('checkout.agree')} ${t('checkout.agreeLink')}`} style={styles.agree}>
            <PressOverlay color={colors.primary} max={0.06} radius={radius.sm} />
            <Icon name="document-text-outline" size={15} color={colors.faint} />
            <Txt variant="tiny" style={styles.flex}>
              {t('checkout.agree')} <Txt variant="tiny" color={colors.primary} style={styles.link}>{t('checkout.agreeLink')}</Txt>
            </Txt>
          </PressableScale>
        </Card>
        {error ? (
          <Animated.View entering={FadeIn.duration(200)} layout={LinearTransition.duration(200)} style={styles.error}>
            <Icon name="alert-circle" size={20} color={colors.sale} />
            <Txt variant="smallStrong" color={colors.sale} style={styles.flex}>{error}</Txt>
          </Animated.View>
        ) : null}
      </FormScroll>
      <FloatingBar>
        <View style={styles.flex}>
          <Txt variant="tiny">{t('cart.total')}</Txt>
          <Txt variant="h3" numberOfLines={1} adjustsFontSizeToFit>{money(summary.total)}</Txt>
        </View>
        <Button title={busy ? t('checkout.placing') : t('checkout.place')} loading={busy} disabled={!live || summary.lines === 0} onPress={submit} full={false} style={styles.placeBtn} size="lg" />
      </FloatingBar>
    </View>
  );
}

/**
 * Yetkazish manzili kartasi: belgilanmagan bo'lsa — xaritani ochadigan katta tugma,
 * belgilangan bo'lsa — manzil, xonadon, mo'ljal va «O'zgartirish».
 */
function AddressCard({ draft, shop, error }: { draft: DeliveryDraft; shop: { lat: number; lng: number } | null; error: string | null }) {
  const { t } = useT();
  const full = fullAddress(draft);
  const pinned = isValidLatLng(draft);
  const open = () => { haptic.tap(); router.push('/address'); };
  if (!full) {
    return (
      <View style={styles.gapSm}>
        <PressableScale onPress={open} scaleTo={0.98} style={[styles.choose, !!error && styles.chooseError]} accessibilityLabel={t('address.choose')}>
          <GlassFill tone="tint" radius={radius.md} />
          <PressOverlay color={colors.primary} max={0.08} radius={radius.md} />
          <View style={styles.chooseIcon}><PartIcon name="map-marker-radius" size={26} color={colors.white} /></View>
          <View style={styles.flex}>
            <Txt variant="bodyStrong" color={colors.primary}>{t('address.choose')}</Txt>
            <Txt variant="small">{t('address.chooseSub')}</Txt>
          </View>
          <Icon name="chevron-forward" size={20} color={colors.primary} />
        </PressableScale>
        {error ? <Txt variant="tiny" color={colors.sale}>{error}</Txt> : null}
      </View>
    );
  }
  const km = pinned && shop ? distanceKm(shop, { lat: draft.lat as number, lng: draft.lng as number }) : null;
  return (
    <PressableScale onPress={open} scaleTo={0.985} style={styles.address} accessibilityLabel={`${t('address.title')}: ${full}. ${t('address.change')}`}>
      <PressOverlay color={colors.primary} max={0.06} radius={radius.md} />
      <View style={styles.addressIcon}><PartIcon name={pinned ? 'map-marker-check' : 'map-marker-outline'} size={24} color={colors.primary} /></View>
      <View style={styles.flex}>
        <Txt variant="bodyStrong" numberOfLines={2}>{full}</Txt>
        {draft.moljal ? <Txt variant="small" numberOfLines={1}>{t('checkout.landmark')}: {draft.moljal}</Txt> : null}
        <View style={styles.addressMeta}>
          {pinned ? <Pill text={t('address.pinned')} tone="success" /> : null}
          {km != null ? <Txt variant="tiny">{t('address.fromShop', { km: formatKm(km) })}</Txt> : null}
        </View>
      </View>
      <Txt variant="smallStrong" color={colors.primary}>{t('address.change')}</Txt>
    </PressableScale>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <View style={[styles.step, shadow.soft]}>
      <View style={styles.stepHead}>
        <View style={styles.stepNum}><Txt variant="smallStrong" color={colors.primary}>{n}</Txt></View>
        <Txt variant="h3">{title}</Txt>
      </View>
      {children}
    </View>
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
  gapSm: { gap: 6 },
  noticeWrap: { marginHorizontal: -16 },
  body: { padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  step: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, gap: 12 },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  shop: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  shopIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  mapLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, alignSelf: 'flex-start', minHeight: 40 },
  choose: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: colors.tint, minHeight: 72 },
  chooseError: { borderWidth: 1.5, borderColor: colors.sale },
  chooseIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  address: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.line },
  addressIcon: { width: 44, height: 44, borderRadius: 13, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  addressMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, flexWrap: 'wrap' },
  pay: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 1.5 },
  payOn: { borderColor: colors.primary, backgroundColor: colors.tint },
  payOff: { borderColor: colors.line, backgroundColor: colors.surfaceAlt },
  payIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  brand: { fontFamily: fonts.heavy, fontSize: 20, lineHeight: 24 },
  payNote: { marginTop: -2, marginLeft: 2 },
  summary: { gap: 10 },
  thumbs: { gap: 8, paddingVertical: 2 },
  thumb: { width: 58, height: 58, borderRadius: radius.sm },
  qty: { position: 'absolute', right: 2, bottom: 2, backgroundColor: colors.scrim, borderRadius: radius.xs, paddingHorizontal: 5 },
  line: { flexDirection: 'row', alignItems: 'center' },
  hr: { height: StyleSheet.hairlineWidth, backgroundColor: colors.line },
  remember: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  agree: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, marginTop: -8, marginBottom: -8 },
  link: { fontFamily: fonts.bold, textDecorationLine: 'underline' },
  error: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.saleSoft },
  placeBtn: { minWidth: 186 },
});
