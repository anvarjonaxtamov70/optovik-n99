import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation, FadeIn, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FavButton } from '../components/shop/FavButton';
import { ProductImage } from '../components/shop/ProductImage';
import { ProductRail } from '../components/shop/ProductRail';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { goBack } from '../components/ui/Header';
import { Icon, PartIcon, type IconName } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { PressableScale } from '../components/ui/PressableScale';
import { Stepper } from '../components/ui/Stepper';
import { Txt } from '../components/ui/Txt';
import { MAX_QTY } from '../domain/cart';
import { discountPercent, LOW_STOCK, similarProducts, type Product } from '../domain/products';
import { categoryLabel, modelBySlug } from '../domain/taxonomy';
import { useT } from '../i18n';
import { haptic } from '../lib/haptics';
import { openList } from '../lib/nav';
import { cart, useQty } from '../state/cart';
import { useCatalogLive, useCatalogStatus, useProduct, useProducts, useSettings } from '../state/catalog';
import { useMyCar } from '../state/prefs';
import { showToast } from '../state/toast';
import { colors, radius, shadow } from '../theme/tokens';

export default function ProductScreen() {
  const { category, id } = useLocalSearchParams<{ category: string; id: string }>();
  const product = useProduct(`${category}/${id}`);
  const status = useCatalogStatus();
  const { t } = useT();
  if (!product) {
    return (
      <View style={[styles.root, styles.center]}>
        <View style={styles.backFloat}><IconButton icon="chevron-back" label={t('common.back')} onPress={() => goBack()} elevated /></View>
        {status === 'loading' ? <Txt variant="body">{t('common.loading')}</Txt> : (
          <EmptyState icon="cube-outline" title={t('product.notFound')} text={t('product.notFoundText')} action={{ label: t('tab.catalog'), onPress: () => router.navigate('/catalog') }} />
        )}
      </View>
    );
  }
  return <ProductView product={product} />;
}

function ProductView({ product: p }: { product: Product }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { t, money, lang } = useT();
  const all = useProducts();
  const car = useMyCar();
  const settings = useSettings();
  const similar = useMemo(() => similarProducts(all, p), [all, p]);
  const galleryH = Math.min(width, 520);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const percent = discountPercent(p);
  const unit = p.birlik ?? t('common.pcs');
  const carModel = modelBySlug(car?.model);
  const fits = carModel ? p.universal || p.modellar.includes(carModel.slug) : null;
  const [expanded, setExpanded] = useState(false);

  const topBar = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [galleryH - 140, galleryH - 70], [0, 1], Extrapolation.CLAMP) }));
  const galleryStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [-200, 0, galleryH], [-100, 0, galleryH * 0.4], Extrapolation.CLAMP) },
      { scale: interpolate(scrollY.value, [-200, 0], [1.35, 1], Extrapolation.CLAMP) },
    ],
  }));

  const share = () => { void Share.share({ message: t('product.shareText', { name: p.nomi, price: money(p.narxi) }) }).catch(() => {}); };
  const copy = async () => { if (p.artikul) { await Clipboard.setStringAsync(p.artikul); haptic.success(); showToast(t('common.copied'), { kind: 'success' }); } };

  return (
    <View style={styles.root}>
      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 + insets.bottom }}>
        <Animated.View style={[{ height: galleryH }, galleryStyle]}>
          <Gallery product={p} height={galleryH} width={Math.min(width, 760)} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(380)} style={styles.sheet}>
          <View style={styles.priceRow}>
            <Txt style={styles.price} color={percent ? colors.sale : colors.ink}>{money(p.narxi)}</Txt>
            {percent ? <Pill text={`−${percent}%`} tone="sale" /> : null}
          </View>
          {p.eskiNarx ? (
            <View style={styles.oldRow}>
              <Txt variant="body" color={colors.faint} style={styles.strike}>{money(p.eskiNarx)}</Txt>
              <Txt variant="smallStrong" color={colors.success}>{t('product.save', { sum: money(p.eskiNarx - p.narxi) })}</Txt>
            </View>
          ) : null}
          <Txt variant="h2" style={styles.name} accessibilityRole="header">{p.nomi}</Txt>
          <View style={styles.metaRow}>
            {p.artikul ? (
              <PressableScale onPress={copy} style={styles.meta} accessibilityLabel={`${t('product.article')} ${p.artikul}. ${t('common.copy')}`}>
                <Icon name="barcode-outline" size={15} color={colors.primary} />
                <Txt variant="smallStrong">{p.artikul}</Txt>
                <Icon name="copy-outline" size={14} color={colors.faint} />
              </PressableScale>
            ) : null}
            {p.brend ? <View style={styles.meta}><Icon name="ribbon-outline" size={15} color={colors.primary} /><Txt variant="smallStrong">{p.brend}</Txt></View> : null}
            <StockBadge product={p} unit={unit} />
          </View>

          {fits !== null && carModel ? (
            <View style={[styles.fit, fits ? styles.fitOk : styles.fitUnknown]}>
              <PartIcon name={fits ? 'car-select' : 'car-info'} size={22} color={fits ? colors.success : colors.warning} />
              <Txt variant="smallStrong" color={fits ? colors.success : colors.warning} style={styles.flex}>
                {fits ? t('product.fitsYourCar', { car: carModel.name }) : t('product.notFitsYourCar', { car: carModel.name })}
              </Txt>
            </View>
          ) : null}

          {p.modellar.length || p.universal ? (
            <Block title={t('product.fits')}>
              {p.universal && !p.modellar.length ? <Txt variant="body">{t('product.universal')}</Txt> : (
                <View style={styles.models}>
                  {p.modellar.map((slug) => {
                    const m = modelBySlug(slug);
                    const mine = car?.model === slug;
                    return (
                      <PressableScale key={slug} onPress={() => openList({ model: slug, title: m?.name })} style={[styles.modelChip, mine && styles.modelChipMine]} accessibilityLabel={m?.name ?? slug}>
                        <PartIcon name="car-side" size={16} color={mine ? colors.white : colors.primary} />
                        <Txt variant="smallStrong" color={mine ? colors.white : colors.ink}>{m?.name ?? slug}</Txt>
                      </PressableScale>
                    );
                  })}
                </View>
              )}
            </Block>
          ) : null}

          <Block title={t('product.deliveryTitle')}>
            <InfoLine icon="bicycle-outline" text={settings.courierEnabled ? `${t('product.deliveryCourier')}${settings.courierFee ? ` — ${money(settings.courierFee)}` : ''}` : t('checkout.courierOff')} />
            {settings.pickupEnabled ? <InfoLine icon="storefront-outline" text={t('product.deliveryPickup')} sub={settings.address} /> : null}
            <InfoLine icon="cash-outline" text={t('product.payCash')} />
          </Block>

          {p.tavsif ? (
            <Block title={t('product.description')}>
              <Txt variant="body" numberOfLines={expanded ? undefined : 5}>{p.tavsif}</Txt>
              {p.tavsif.length > 220 ? (
                <PressableScale onPress={() => setExpanded((v) => !v)} accessibilityLabel={expanded ? t('product.less') : t('product.more')}>
                  <Txt variant="smallStrong" color={colors.primary}>{expanded ? t('product.less') : t('product.more')}</Txt>
                </PressableScale>
              ) : null}
            </Block>
          ) : null}

          <Block title={t('product.specs')}>
            <Spec label={t('product.category')} value={categoryLabel(p.kategoriya, lang)} />
            {p.artikul ? <Spec label={t('product.article')} value={p.artikul} /> : null}
            {p.brend ? <Spec label={t('product.brand')} value={p.brend} /> : null}
            {p.model ? <Spec label={t('product.fits')} value={p.model} /> : null}
          </Block>
        </Animated.View>

        <View style={styles.similar}>
          <ProductRail title={t('product.similar')} products={similar} />
        </View>
      </Animated.ScrollView>

      <Animated.View style={[styles.topBar, { height: insets.top + 56 }, topBar]} pointerEvents="none">
        <Txt variant="h3" numberOfLines={1} style={[styles.topTitle, { marginTop: insets.top + 16 }]}>{p.nomi}</Txt>
      </Animated.View>
      <View style={[styles.floatRow, { top: insets.top + 8 }]}>
        <IconButton icon="chevron-back" label={t('common.back')} onPress={() => goBack()} size={42} elevated />
        <View style={styles.floatRight}>
          <IconButton icon="share-outline" label={t('common.share')} onPress={share} size={42} elevated />
          <FavButton id={p.id} name={p.nomi} size={42} />
        </View>
      </View>
      <BuyBar product={p} bottom={insets.bottom} />
    </View>
  );
}

function Gallery({ product: p, height, width }: { product: Product; height: number; width: number }) {
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { x.value = e.contentOffset.x; });
  const images = p.rasmlar.length ? p.rasmlar : [undefined];
  return (
    <View style={{ height, backgroundColor: colors.white }}>
      <Animated.ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}>
        {images.map((uri, i) => (
          <ProductImage key={uri ?? i} uri={uri} kategoriya={p.kategoriya} seed={p.id} style={{ width, height }} iconScale={0.3} />
        ))}
      </Animated.ScrollView>
      {images.length > 1 ? (
        <View style={styles.dots}>{images.map((_, i) => <GalleryDot key={i} i={i} x={x} width={width} />)}</View>
      ) : null}
      <LinearGradient colors={['rgba(243,247,251,0)', 'rgba(243,247,251,0.9)']} style={styles.fade} pointerEvents="none" />
    </View>
  );
}

function GalleryDot({ i, x, width }: { i: number; x: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const v = interpolate(Math.abs(x.value / width - i), [0, 1], [1, 0], Extrapolation.CLAMP);
    return { width: 6 + v * 14, opacity: 0.4 + v * 0.6 };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

function StockBadge({ product: p, unit }: { product: Product; unit: string }) {
  const { t } = useT();
  const sold = p.qoldiq <= 0;
  const low = !sold && p.qoldiq <= LOW_STOCK;
  const color = sold ? colors.sale : low ? colors.warning : colors.success;
  return (
    <View style={styles.meta}>
      <View style={[styles.stockDot, { backgroundColor: color }]} />
      <Txt variant="smallStrong" color={color}>{sold ? t('product.outOfStock') : low ? t('product.lowStock', { n: p.qoldiq, unit }) : t('product.inStockN', { n: p.qoldiq, unit })}</Txt>
    </View>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Txt variant="h3">{title}</Txt>
      {children}
    </View>
  );
}

function InfoLine({ icon, text, sub }: { icon: IconName; text: string; sub?: string }) {
  return (
    <View style={styles.infoLine}>
      <View style={styles.infoIcon}><Icon name={icon} size={18} color={colors.primary} /></View>
      <View style={styles.flex}>
        <Txt variant="body" color={colors.ink}>{text}</Txt>
        {sub ? <Txt variant="small">{sub}</Txt> : null}
      </View>
    </View>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.spec}>
      <Txt variant="small" style={styles.specLabel}>{label}</Txt>
      <Txt variant="smallStrong" style={styles.specValue}>{value}</Txt>
    </View>
  );
}

function BuyBar({ product: p, bottom }: { product: Product; bottom: number }) {
  const qty = useQty(p.id);
  const live = useCatalogLive();
  const { t, money } = useT();
  const sold = p.qoldiq <= 0;
  const add = () => {
    haptic.success();
    cart.add(p);
    showToast(t('product.added'), { kind: 'success', icon: 'cart', action: { label: t('product.goToCart'), onPress: () => router.navigate('/cart') } });
  };
  return (
    <View style={[styles.buyBar, { paddingBottom: Math.max(bottom, 12) }]}>
      <View style={styles.buyPrice}>
        <Txt variant="tiny">{qty > 0 ? `${qty} × ${money(p.narxi)}` : t('cart.total')}</Txt>
        <Txt variant="h3" numberOfLines={1} adjustsFontSizeToFit>{money(p.narxi * Math.max(qty, 1))}</Txt>
      </View>
      <View style={styles.buyAction}>
        {sold ? <Button title={t('product.soldOut')} disabled variant="secondary" /> : qty > 0 ? (
          <Animated.View entering={FadeIn.duration(180)} style={styles.buyRow}>
            <View style={styles.flex}>
              <Stepper value={qty} max={Math.min(p.qoldiq, MAX_QTY)} size="lg" labelInc="+1" labelDec="−1"
                onInc={() => { if (qty >= p.qoldiq) { haptic.warning(); showToast(t('product.limit'), { kind: 'error' }); } else cart.inc(p); }}
                onDec={() => cart.dec(p)} />
            </View>
            <IconButton icon="cart" label={t('product.goToCart')} onPress={() => router.navigate('/cart')} size={52} bg={colors.primary} color={colors.white} />
          </Animated.View>
        ) : (
          <Button title={t('product.add')} icon="cart-outline" size="lg" onPress={add} disabled={!live} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  center: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  backFloat: { position: 'absolute', top: 54, left: 12 },
  sheet: { marginTop: -24, backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: 18, paddingTop: 20, gap: 10, width: '100%', maxWidth: 760, alignSelf: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  price: { fontFamily: 'Manrope_800ExtraBold', fontSize: 28, lineHeight: 34, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  oldRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: -4 },
  strike: { textDecorationLine: 'line-through' },
  name: { marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, height: 32, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  fit: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, marginTop: 4 },
  fitOk: { backgroundColor: colors.successSoft },
  fitUnknown: { backgroundColor: colors.warningSoft },
  block: { gap: 10, paddingTop: 14, marginTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  models: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, height: 36, borderRadius: radius.pill, backgroundColor: colors.tint },
  modelChipMine: { backgroundColor: colors.primary },
  infoLine: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIcon: { width: 36, height: 36, borderRadius: 11, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  spec: { flexDirection: 'row', gap: 12, paddingVertical: 4 },
  specLabel: { width: '38%' },
  specValue: { flex: 1 },
  similar: { paddingTop: 18 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.white, ...shadow.soft, paddingHorizontal: 110 },
  topTitle: { textAlign: 'center' },
  floatRow: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  floatRight: { flexDirection: 'row', gap: 8 },
  dots: { position: 'absolute', bottom: 34, alignSelf: 'center', flexDirection: 'row', gap: 5 },
  dot: { height: 6, borderRadius: 3, backgroundColor: colors.primary },
  fade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 40 },
  buyBar: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.white, ...shadow.float },
  buyPrice: { width: '34%' },
  buyAction: { flex: 1 },
  buyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
