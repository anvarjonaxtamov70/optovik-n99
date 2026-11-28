import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '../components/brand/Logo';
import { BannerCarousel } from '../components/shop/BannerCarousel';
import { CatalogNotice, CategoryGrid, ModelRail, SearchPill, useCategories } from '../components/shop/CatalogBits';
import { ProductCard, ProductCardSkeleton } from '../components/shop/ProductCard';
import { useGrid } from '../components/shop/ProductGrid';
import { ProductRail } from '../components/shop/ProductRail';
import { useTabBarSpace } from '../components/TabBar';
import { SectionTitle } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { GlassFill } from '../components/ui/Glass';
import { Icon, PartIcon, type IconName } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { PressableScale, PressOverlay } from '../components/ui/PressableScale';
import { Txt } from '../components/ui/Txt';
import { bannerHasContent, candidateHomeBanners, DEFAULT_BANNERS } from '../domain/content';
import { discountPercent, type Product } from '../domain/products';
import { modelBySlug } from '../domain/taxonomy';
import { useT } from '../i18n';
import { callPhone } from '../lib/links';
import { openList } from '../lib/nav';
import { usesFirestoreCandidate } from '../lib/orderBackend';
import { catalogStore, retryCatalog, useBanners, useCatalogStatus, useProducts, useSettings } from '../state/catalog';
import { useMyCar } from '../state/prefs';
import { colors, fill, gradients, radius, shadow } from '../theme/tokens';

const TOP_ROW = 50;
const SEARCH_ROW = 62;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const products = useProducts();
  const status = useCatalogStatus();
  const settings = useSettings();
  const car = useMyCar();
  const carModel = modelBySlug(car?.model);
  const { columns, cardWidth, gap } = useGrid();
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { scrollY.value = e.contentOffset.y; });
  const headerH = insets.top + TOP_ROW + SEARCH_ROW;
  const tabSpace = useTabBarSpace();

  const header = useAnimatedStyle(() => ({ transform: [{ translateY: -interpolate(scrollY.value, [0, TOP_ROW], [0, TOP_ROW], Extrapolation.CLAMP) }] }));
  const topRow = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [0, TOP_ROW * 0.7], [1, 0], Extrapolation.CLAMP) }));
  const shade = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [TOP_ROW, TOP_ROW + 30], [0, 1], Extrapolation.CLAMP) }));

  const all = useMemo(() => [...products].sort((a, b) => Number(b.qoldiq > 0) - Number(a.qoldiq > 0)), [products]);
  const loading = status === 'loading' && products.length === 0;
  // Pastga tortib yangilash: katalog qayta kelganda (yoki 6 soniyadan keyin) spinner to'xtaydi.
  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => {
    setRefreshing(true);
    const from = catalogStore.get().version;
    retryCatalog();
    let done = false;
    const stop = () => { if (done) return; done = true; off(); clearTimeout(timer); setRefreshing(false); };
    const off = catalogStore.subscribe(() => { if (catalogStore.get().version !== from) stop(); });
    const timer = setTimeout(stop, 6000);
  }, []);

  return (
    <View style={styles.root}>
      <Animated.FlatList
        key={columns}
        data={loading ? [] : all}
        numColumns={columns}
        keyExtractor={(p: Product) => p.id}
        columnWrapperStyle={columns > 1 ? { gap, paddingHorizontal: 16 } : undefined}
        contentContainerStyle={[styles.list, { paddingTop: headerH + 8, paddingBottom: tabSpace }]}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        windowSize={9}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} progressViewOffset={headerH} tintColor={colors.primary} colors={[colors.primary]} />}
        ListHeaderComponent={<HomeSections products={products} loading={loading} carSlug={carModel?.slug ?? null} />}
        ListEmptyComponent={loading ? (
          <View style={[styles.skeletons, { gap }]}>{[0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} width={cardWidth} />)}</View>
        ) : (
          <EmptyState partIcon="car-cog" title={t('home.emptyTitle')} text={t('home.emptyText')} action={status === 'error' ? { label: t('common.retry'), onPress: retryCatalog } : undefined} />
        )}
        renderItem={({ item }: { item: Product }) => <ProductCard product={item} width={cardWidth} />}
      />

      <Animated.View style={[styles.header, { paddingTop: insets.top }, header]}>
        <Animated.View style={[styles.shade, shade]} pointerEvents="none" />
        <Animated.View style={[styles.topRow, topRow]}>
          <Logo height={24} />
          <View style={styles.topRight}>
            {/* Joylashuvni tanlash yo'q — bu do'kon manzili, bosilganda «Biz bilan aloqa» ochiladi. */}
            <PressableScale onPress={() => router.push('/contact')} style={[styles.location, shadow.xs]} hitSlop={6}
              accessibilityLabel={`${t('contact.shopLocation')}: ${settings.address}`}>
              <GlassFill tone="light" radius={radius.pill} />
              <Icon name="location" size={15} color={colors.primary} />
              <Txt variant="smallStrong" color={colors.ink}>{t('home.location')}</Txt>
              <Icon name="chevron-forward" size={13} color={colors.muted} />
            </PressableScale>
            {settings.phone ? <IconButton icon="call" label={t('common.call')} onPress={() => callPhone(settings.phone)} size={40} bg={colors.tint} color={colors.primary} iconSize={18} /> : null}
          </View>
        </Animated.View>
        <View style={styles.searchRow}>
          <View style={styles.flex}><SearchPill placeholder={t('home.searchPlaceholder')} /></View>
          <PressableScale onPress={() => router.push('/garage')} feedback="tap" style={[styles.car, carModel && styles.carOn, carModel ? shadow.buttonSm : shadow.xs]} accessibilityLabel={carModel ? `${t('home.myCar')}: ${carModel.name}` : t('home.chooseCar')}>
            <GlassFill tone={carModel ? 'primary' : 'tint'} radius={radius.md} />
            <PartIcon name="car-side" size={20} color={carModel ? colors.white : colors.primary} />
            {carModel ? <Txt variant="tiny" color={colors.white} numberOfLines={1} style={styles.carText}>{carModel.name}</Txt> : null}
          </PressableScale>
        </View>
      </Animated.View>
    </View>
  );
}

/** Kichik katalogda bir xil tovarlar bosh sahifada 3–4 marta takrorlanmasin: bo'limlar faqat katalog kattalashganda chiqadi. */
const RAILS_FROM = 12;
/** Kategoriyalar to'ri kamida shuncha bo'lim bo'lganda ko'rinadi (bitta katak yolg'iz turib qolmasin). */
const GRID_FROM = 4;

function HomeSections({ products, loading, carSlug }: { products: Product[]; loading: boolean; carSlug: string | null }) {
  const { t } = useT();
  const remote = useBanners();
  // Bo'sh javonni reklama qilmaymiz: bosilganda bo'sh ro'yxat ochadigan banner ko'rsatilmaydi.
  const banners = useMemo(() => {
    if(usesFirestoreCandidate)return candidateHomeBanners(remote,products);
    const list = remote && remote.length ? remote : DEFAULT_BANNERS;
    return products.length ? list.filter((b) => bannerHasContent(b.link, products)) : list;
  }, [remote, products]);
  const categories = useCategories(products);
  const filled = categories.filter((c) => c.count > 0);
  const rails = loading || products.length >= RAILS_FROM;
  const car = modelBySlug(carSlug);
  const sale = useMemo(() => products.filter((p) => discountPercent(p) > 0 && p.qoldiq > 0).sort((a, b) => discountPercent(b) - discountPercent(a)), [products]);
  const popular = useMemo(() => products.filter((p) => p.ommabop && p.qoldiq > 0), [products]);
  const fresh = useMemo(() => products.filter((p) => p.yangi), [products]);
  const forCar = useMemo(() => (carSlug ? products.filter((p) => p.qoldiq > 0 && p.modellar.includes(carSlug)) : []), [products, carSlug]);

  return (
    <View style={styles.sections}>
      <CatalogNotice />
      <BannerCarousel banners={banners} />
      <Perks />
      {loading || filled.length >= GRID_FROM ? (
        <View style={styles.block}>
          <SectionTitle title={t('home.categories')} action={t('common.seeAll')} onAction={() => router.navigate('/catalog')} />
          <CategoryGrid items={categories.slice(0, 8)} />
        </View>
      ) : null}
      {car ? (
        <ProductRail title={t('home.forCar', { car: car.name })} products={forCar} loading={loading} seeAllLabel={t('common.seeAll')} onSeeAll={() => openList({ model: car.slug, title: car.name })} />
      ) : <CarCta />}
      {rails ? (
        <>
          <ProductRail title={t('home.sale')} products={sale} loading={loading} seeAllLabel={t('common.seeAll')} onSeeAll={() => openList({ sale: '1', title: t('home.sale') })} />
          <ProductRail title={t('home.popular')} products={popular} seeAllLabel={t('common.seeAll')} onSeeAll={() => openList({ popular: '1', title: t('home.popular') })} />
          <ProductRail title={t('home.new')} products={fresh} seeAllLabel={t('common.seeAll')} onSeeAll={() => openList({ new: '1', title: t('home.new') })} />
        </>
      ) : null}
      <View style={styles.block}>
        <SectionTitle title={t('home.models')} />
        <ModelRail selected={carSlug} />
      </View>
      {products.length > 0 || loading ? <SectionTitle title={t('home.all')} style={styles.allTitle} /> : null}
    </View>
  );
}

/** Ishonch belgilari: bitta ixcham kartada uch ustun (avval chetdan kesilib turgan aylanma qator edi). */
function Perks() {
  const { t } = useT();
  const items: { icon: IconName; label: string; onPress: () => void }[] = [
    { icon: 'shield-checkmark-outline', label: t('home.perks.original'), onPress: () => router.push({ pathname: '/info/[page]', params: { page: 'about' } }) },
    { icon: 'cash-outline', label: t('home.perks.cash'), onPress: () => router.push({ pathname: '/info/[page]', params: { page: 'delivery' } }) },
    { icon: 'bicycle-outline', label: t('home.perks.delivery'), onPress: () => router.push({ pathname: '/info/[page]', params: { page: 'delivery' } }) },
  ];
  return (
    <View style={[styles.perks, shadow.soft]}>
      {items.map((p, i) => (
        <PressableScale key={p.icon} onPress={p.onPress} scaleTo={0.96} style={[styles.perk, i > 0 && styles.perkLine]} accessibilityLabel={p.label}>
          <Icon name={p.icon} size={20} color={colors.primary} />
          <Txt variant="tiny" color={colors.ink} numberOfLines={2} center style={styles.perkText}>{p.label}</Txt>
        </PressableScale>
      ))}
    </View>
  );
}

function CarCta() {
  const { t } = useT();
  return (
    <View style={styles.ctaWrap}>
      <PressableScale onPress={() => router.push('/garage')} scaleTo={0.975} feedback="tap" accessibilityLabel={t('home.carBannerTitle')} style={[styles.cta, shadow.card]}>
        <LinearGradient colors={gradients.night} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.ctaFill} />
        <PressOverlay color={colors.black} max={0.12} radius={radius.lg} />
        <View style={styles.ctaIcon}><PartIcon name="car-cog" size={30} color={colors.white} /></View>
        <View style={styles.flex}>
          <Txt variant="bodyStrong" color={colors.white}>{t('home.carBannerTitle')}</Txt>
          <Txt variant="small" color={colors.onBrandMuted}>{t('home.carBannerText')}</Txt>
        </View>
        <Icon name="chevron-forward" size={20} color={colors.white} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  list: { paddingBottom: 24, gap: 10 },
  skeletons: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  header: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: colors.white, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, zIndex: 5 },
  shade: { ...fill, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, ...shadow.card, backgroundColor: colors.white },
  topRow: { height: TOP_ROW, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, height: 40, borderRadius: radius.pill, backgroundColor: colors.white },
  searchRow: { height: SEARCH_ROW, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 6 },
  car: { height: 48, minWidth: 48, paddingHorizontal: 10, borderRadius: radius.md, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  carOn: { backgroundColor: colors.primary },
  carText: { maxWidth: 64 },
  sections: { gap: 22, paddingBottom: 4 },
  block: { gap: 12 },
  perks: { flexDirection: 'row', marginHorizontal: 16, paddingVertical: 10, backgroundColor: colors.white, borderRadius: radius.lg },
  perk: { flex: 1, alignItems: 'center', gap: 5, paddingHorizontal: 6, minHeight: 48, justifyContent: 'center' },
  perkLine: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.line },
  perkText: { lineHeight: 14 },
  ctaWrap: { paddingHorizontal: 16 },
  // `overflow: hidden` yo'q (iOS soyani kesadi): gradient o'zi yumaloq burchakli, fon esa soya uchun.
  cta: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: radius.lg, backgroundColor: colors.primaryDeep },
  ctaFill: { ...fill, borderRadius: radius.lg },
  ctaIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.onBrandGlass, alignItems: 'center', justifyContent: 'center' },
  allTitle: { marginTop: 2 },
});
