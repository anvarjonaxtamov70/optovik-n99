import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Linking, Platform, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressMap } from '../components/shop/AddressMap';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { FormScroll } from '../components/ui/FormScroll';
import { GlassFill } from '../components/ui/Glass';
import { goBack } from '../components/ui/Header';
import { PartIcon } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { Txt } from '../components/ui/Txt';
import { fullAddress } from '../domain/order';
import { distanceKm, isValidLatLng, roundCoord, SAMARQAND, type LatLng } from '../domain/geo';
import { useT } from '../i18n';
import { haptic } from '../lib/haptics';
import { addressAt, askLocation, currentPoint, hasLocationPermission } from '../lib/location';
import { useSettings } from '../state/catalog';
import { deliveryStore, setDeliveryDraft } from '../state/delivery';
import { showToast } from '../state/toast';
import { spring } from '../theme/motion';
import { colors, radius, shadow } from '../theme/tokens';

/** Xarita yuklanayotgandagi "o'z-o'zidan" harakatlar foydalanuvchi tanlovi hisoblanmaydi. */
const SETTLE_MS = 900;

/**
 * Yetkazish manzilini xaritada belgilash: belgi markazda, foydalanuvchi xaritani suradi.
 * Ko'cha va uy raqami telefon geokoderidan avtomatik yoziladi; xonadon va mo'ljal qo'lda.
 * Xarita ishlamasa ham (masalan, Google xizmatlarisiz telefon) manzilni yozib davom etish mumkin.
 */
export default function AddressScreen() {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const { t } = useT();
  const settings = useSettings();
  const [saved] = useState(() => deliveryStore.get());
  const savedPoint = isValidLatLng(saved) ? { lat: saved.lat as number, lng: saved.lng as number } : null;
  const shop = settings.lat != null && settings.lng != null ? { lat: settings.lat, lng: settings.lng } : SAMARQAND;
  const [initial] = useState<LatLng>(savedPoint ?? shop);
  const [point, setPoint] = useState<LatLng | null>(savedPoint);
  const [form, setForm] = useState({ manzil: saved.manzil, xonadon: saved.xonadon, moljal: saved.moljal });
  const [focus, setFocus] = useState<{ point: LatLng; seq: number } | null>(null);
  const [permitted, setPermitted] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [touched, setTouched] = useState(false);
  // Foydalanuvchi nuqtani o'zi tanladimi (surdi yoki «Mening joylashuvim»). Ref — hodisalar uchun, holat — ekran uchun.
  const [isChosen, setChosen] = useState(!!savedPoint);
  const chosen = useRef(!!savedPoint);
  const mountedAt = useRef(0);
  const lastGeo = useRef<LatLng | null>(savedPoint);
  const geoSeq = useRef(0);
  const lift = useSharedValue(0);
  const pin = useAnimatedStyle(() => ({ transform: [{ translateY: -lift.value * 10 }] }));
  const dot = useAnimatedStyle(() => ({ transform: [{ scale: 1 - lift.value * 0.35 }], opacity: 1 - lift.value * 0.4 }));

  const markChosen = useCallback(() => { chosen.current = true; setChosen(true); }, []);
  const flyTo = useCallback((p: LatLng) => {
    markChosen();
    setFocus((f) => ({ point: p, seq: (f?.seq ?? 0) + 1 }));
  }, [markChosen]);

  useEffect(() => {
    mountedAt.current = Date.now();
    let alive = true;
    void (async () => {
      const ok = await hasLocationPermission();
      if (!alive) return;
      setPermitted(ok);
      // Ruxsat avval berilgan bo'lsa va manzil hali yo'q bo'lsa — darhol foydalanuvchi turgan joyga.
      if (ok && !chosen.current) {
        const here = await currentPoint();
        if (alive && here && !chosen.current) flyTo(here);
      }
    })();
    return () => { alive = false; };
  }, [flyTo]);

  const onMoveStart = () => {
    if (Date.now() - mountedAt.current > SETTLE_MS) markChosen();
    lift.set(withSpring(1, spring.snappy));
  };

  const onCenter = (p: LatLng) => {
    lift.set(withSpring(0, spring.snappy));
    if (!chosen.current) return;
    setPoint(p);
    // Deyarli joyidan qimirlamagan bo'lsa (5 m) — yozilgan manzilni qayta yozmaymiz.
    if (lastGeo.current && distanceKm(lastGeo.current, p) < 0.005) return;
    lastGeo.current = p;
    const seq = ++geoSeq.current;
    setGeocoding(true);
    void addressAt(p, permitted).then((text) => {
      if (seq !== geoSeq.current) return;
      setGeocoding(false);
      if (text) setForm((f) => ({ ...f, manzil: text }));
    });
  };

  const locate = async () => {
    haptic.tap();
    setLocating(true);
    try {
      const access = permitted ? 'granted' : await askLocation();
      if (access !== 'granted') {
        showToast(t('address.denied'), access === 'blocked'
          ? { kind: 'error', action: { label: t('address.openSettings'), onPress: () => void Linking.openSettings() } }
          : { kind: 'error' });
        return;
      }
      setPermitted(true);
      const here = await currentPoint();
      if (here) flyTo(here);
      else showToast(t('address.notFound'), { kind: 'error' });
    } finally {
      setLocating(false);
    }
  };

  const ready = fullAddress(form).length >= 6;
  const confirm = () => {
    setTouched(true);
    if (!ready) { haptic.warning(); return; }
    haptic.success();
    const p = chosen.current && point ? point : null;
    setDeliveryDraft({
      manzil: form.manzil.trim(), xonadon: form.xonadon.trim(), moljal: form.moljal.trim(),
      lat: p ? roundCoord(p.lat) : null, lng: p ? roundCoord(p.lng) : null,
    });
    goBack('/checkout');
  };

  const noGeocoder = !geocoding && isChosen && !permitted;
  const nativeMap = Platform.OS !== 'web';
  return (
    <KeyboardAvoidingView behavior="padding" style={styles.root}>
      <View style={styles.mapArea}>
        <AddressMap initial={initial} focus={focus} onCenter={onCenter} onMoveStart={onMoveStart} showsUser={permitted} style={styles.map} />
        {/* Markazdagi belgi: xarita surilganda biroz ko'tariladi, to'xtaganda joyiga tushadi. */}
        {nativeMap ? (
          <View pointerEvents="none" style={styles.pinLayer}>
            <Animated.View style={[styles.pinShadow, dot]} />
            <Animated.View style={[styles.pin, pin]}>
              <PartIcon name="map-marker" size={48} color={colors.primary} />
            </Animated.View>
          </View>
        ) : null}
        <View style={[styles.top, { top: insets.top + 8 }]} pointerEvents="box-none">
          <IconButton icon="chevron-back" label={t('common.back')} onPress={() => goBack('/checkout')} size={44} elevated />
          <View style={[styles.hint, shadow.xs]}>
            <GlassFill tone="clear" radius={radius.pill} real />
            <Txt variant="smallStrong" numberOfLines={2} style={styles.hintText}>{t('address.hint')}</Txt>
          </View>
        </View>
        <View style={[styles.locate, !nativeMap && styles.hidden]}>
          {locating ? (
            <View style={[styles.locating, shadow.xs]}><GlassFill tone="clear" radius={22} real /><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <IconButton icon="locate" label={t('address.myLocation')} onPress={() => void locate()} size={44} elevated color={colors.primary} />
          )}
        </View>
      </View>

      <View style={[styles.panel, shadow.float, { maxHeight: height * 0.62, paddingBottom: Math.max(insets.bottom, 12) }]}>
        <FormScroll avoid={false} bounces={false} contentContainerStyle={styles.panelBody}>
          <Txt variant="h3">{t('address.title')}</Txt>
          <Field label={t('address.street')} icon="location-outline" placeholder={t('address.streetPh')} value={form.manzil} maxLength={200}
            onChangeText={(v) => setForm((f) => ({ ...f, manzil: v }))} autoComplete="street-address"
            hint={geocoding ? t('address.detecting') : noGeocoder ? t('address.typeStreet') : undefined}
            error={touched && !ready ? t('checkout.err.required') : null} />
          <Field label={t('address.apartment')} icon="business-outline" placeholder={t('address.apartmentPh')} value={form.xonadon} maxLength={80}
            onChangeText={(v) => setForm((f) => ({ ...f, xonadon: v }))} />
          <Field label={t('checkout.landmark')} icon="flag-outline" placeholder={t('checkout.landmarkPh')} value={form.moljal} maxLength={200}
            onChangeText={(v) => setForm((f) => ({ ...f, moljal: v }))} />
          <Button title={t('address.confirm')} icon="checkmark" size="lg" onPress={confirm} />
        </FormScroll>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  mapArea: { flex: 1, minHeight: 140 },
  map: { flex: 1 },
  pinLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  // Belgining uchi (ikonka pastki markazi) aynan xarita markazida turadi.
  pin: { position: 'absolute', left: '50%', top: '50%', marginLeft: -24, marginTop: -46 },
  pinShadow: { position: 'absolute', left: '50%', top: '50%', marginLeft: -7, marginTop: -3, width: 14, height: 6, borderRadius: 7, backgroundColor: 'rgba(15,35,56,0.28)' },
  hidden: { display: 'none' },
  top: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  hint: { flex: 1, minHeight: 40, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8, justifyContent: 'center' },
  hintText: { fontSize: 12.5, lineHeight: 16 },
  locate: { position: 'absolute', right: 14, bottom: 34 },
  locating: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  panel: { marginTop: -24, backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  panelBody: { padding: 16, paddingTop: 18, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
});
