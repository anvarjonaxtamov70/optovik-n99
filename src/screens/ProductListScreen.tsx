import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CatalogNotice } from '../components/shop/CatalogBits';
import { ProductCard, ProductCardSkeleton } from '../components/shop/ProductCard';
import { useGrid } from '../components/shop/ProductGrid';
import { Button } from '../components/ui/Button';
import { Chip, Radio, SwitchRow } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { Field } from '../components/ui/Field';
import { Header } from '../components/ui/Header';
import { Icon } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { PressableScale } from '../components/ui/PressableScale';
import { Sheet } from '../components/ui/Sheet';
import { Txt } from '../components/ui/Txt';
import { applyFilters, type Filters, type Product, type SortKey } from '../domain/products';
import { CAR_MODELS, categoryLabel, modelBySlug } from '../domain/taxonomy';
import { useT, type TKey } from '../i18n';
import { useCatalogStatus, useProducts } from '../state/catalog';
import { useMyCar } from '../state/prefs';
import { colors, radius } from '../theme/tokens';

const SORTS: SortKey[] = ['popular', 'cheap', 'expensive', 'new', 'discount'];

export default function ProductListScreen() {
  const params = useLocalSearchParams<{ title?: string; category?: string; group?: string; model?: string; q?: string; sale?: string; new?: string; popular?: string }>();
  const { t, lang } = useT();
  const products = useProducts();
  const status = useCatalogStatus();
  const myCar = useMyCar();
  const { columns, cardWidth, gap } = useGrid();
  const base: Filters = useMemo(() => ({
    query: params.q, category: params.category ?? null,
    group: params.group === 'parts' || params.group === 'accessories' ? params.group : null,
    model: params.model ?? null, sale: params.sale === '1', newOnly: params.new === '1', popularOnly: params.popular === '1',
  }), [params.q, params.category, params.group, params.model, params.sale, params.new, params.popular]);
  const [extra, setExtra] = useState<Filters>({ sort: 'popular', inStock: false, model: null, minPrice: null, maxPrice: null });
  const [sheet, setSheet] = useState<'sort' | 'filter' | null>(null);
  const filters = useMemo<Filters>(() => ({ ...base, ...extra, model: extra.model ?? base.model, sale: base.sale || extra.sale }), [base, extra]);
  const list = useMemo(() => applyFilters(products, filters), [products, filters]);
  const title = params.title || (params.category ? categoryLabel(params.category, lang) : params.model ? modelBySlug(params.model)?.name : '') || t('catalog.title');
  const activeCount = Number(!!extra.inStock) + Number(!!extra.sale) + Number(!!extra.model) + Number(extra.minPrice != null || extra.maxPrice != null);
  const loading = status === 'loading' && products.length === 0;
  const reset = () => setExtra({ sort: extra.sort, inStock: false, model: null, minPrice: null, maxPrice: null, sale: false });

  return (
    <View style={styles.root}>
      <Header title={title} subtitle={loading ? t('common.loading') : t('list.found', { n: list.length })}
        right={<IconButton icon="search" label={t('search.placeholder')} onPress={() => router.push('/search')} size={40} bg={colors.surfaceAlt} />} />
      <View style={styles.bar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <PressableScale onPress={() => setSheet('sort')} style={styles.tool} accessibilityLabel={t('list.sort')}>
            <Icon name="swap-vertical" size={16} color={colors.primary} />
            <Txt variant="smallStrong">{t(`sort.${extra.sort ?? 'popular'}` as TKey)}</Txt>
          </PressableScale>
          <PressableScale onPress={() => setSheet('filter')} style={[styles.tool, activeCount > 0 && styles.toolOn]} accessibilityLabel={t('list.filter')}>
            <Icon name="options-outline" size={16} color={activeCount ? colors.white : colors.primary} />
            <Txt variant="smallStrong" color={activeCount ? colors.white : colors.ink}>{t('list.filter')}{activeCount ? ` · ${activeCount}` : ''}</Txt>
          </PressableScale>
          <Chip label={t('list.inStock')} selected={!!extra.inStock} onPress={() => setExtra((e) => ({ ...e, inStock: !e.inStock }))} />
          {!base.sale ? <Chip label={t('home.sale')} icon="pricetag-outline" selected={!!extra.sale} onPress={() => setExtra((e) => ({ ...e, sale: !e.sale }))} /> : null}
          {myCar && !base.model ? (
            <Chip label={modelBySlug(myCar.model)?.name ?? ''} partIcon="car-side" selected={extra.model === myCar.model} onPress={() => setExtra((e) => ({ ...e, model: e.model === myCar.model ? null : myCar.model }))} />
          ) : null}
        </ScrollView>
      </View>
      <FlatList
        key={columns}
        data={loading ? [] : list}
        numColumns={columns}
        keyExtractor={(p: Product) => p.id}
        columnWrapperStyle={columns > 1 ? { gap, paddingHorizontal: 16 } : undefined}
        contentContainerStyle={styles.list}
        initialNumToRender={6}
        windowSize={9}
        ListHeaderComponent={<CatalogNotice />}
        ListEmptyComponent={loading ? (
          <View style={[styles.skeletons, { gap }]}>{[0, 1, 2, 3].map((i) => <ProductCardSkeleton key={i} width={cardWidth} />)}</View>
        ) : (
          <EmptyState icon="search-outline" title={t('list.emptyTitle')} text={t('list.emptyText')} action={activeCount ? { label: t('list.clear'), onPress: reset } : undefined} />
        )}
        renderItem={({ item, index }) => (
          <Animated.View entering={index < 6 ? FadeInDown.delay(index * 50).duration(340) : undefined}>
            <ProductCard product={item} width={cardWidth} />
          </Animated.View>
        )}
      />

      <Sheet visible={sheet === 'sort'} onClose={() => setSheet(null)} title={t('list.sort')} closeLabel={t('common.close')}>
        {SORTS.map((s) => (
          <PressableScale key={s} onPress={() => { setExtra((e) => ({ ...e, sort: s })); setSheet(null); }} style={styles.sortRow} accessibilityLabel={t(`sort.${s}` as TKey)} accessibilityState={{ selected: extra.sort === s }}>
            <Txt variant="bodyStrong" style={styles.flex}>{t(`sort.${s}` as TKey)}</Txt>
            <Radio checked={extra.sort === s} />
          </PressableScale>
        ))}
      </Sheet>

      <FilterSheet visible={sheet === 'filter'} onClose={() => setSheet(null)} value={extra} lockedModel={base.model}
        onApply={(v) => { setExtra(v); setSheet(null); }} count={(v) => applyFilters(products, { ...base, ...v, model: v.model ?? base.model, sale: base.sale || v.sale }).length} />
    </View>
  );
}

function FilterSheet({ visible, onClose, value, onApply, count, lockedModel }: {
  visible: boolean; onClose: () => void; value: Filters; onApply: (v: Filters) => void; count: (v: Filters) => number; lockedModel: string | null | undefined;
}) {
  const { t } = useT();
  const [draft, setDraft] = useState(value);
  const [open, setOpen] = useState(false);
  if (visible && !open) { setOpen(true); setDraft(value); }
  if (!visible && open) setOpen(false);
  const n = count(draft);
  const num = (s: string) => { const v = parseInt(s.replace(/\D/g, ''), 10); return Number.isFinite(v) ? v : null; };
  return (
    <Sheet visible={visible} onClose={onClose} title={t('list.filter')} closeLabel={t('common.close')}
      footer={<View style={styles.footer}>
        <Button title={t('common.reset')} variant="secondary" full={false} style={styles.flex} onPress={() => setDraft({ sort: draft.sort, inStock: false, sale: false, model: null, minPrice: null, maxPrice: null })} />
        <Button title={t('list.show', { n })} full={false} style={styles.flex2} onPress={() => onApply(draft)} />
      </View>}>
      <SwitchRow title={t('list.inStock')} value={!!draft.inStock} onChange={(v) => setDraft((d) => ({ ...d, inStock: v }))} />
      <SwitchRow title={t('list.saleOnly')} value={!!draft.sale} onChange={(v) => setDraft((d) => ({ ...d, sale: v }))} />
      {!lockedModel ? (
        <View style={styles.group}>
          <Txt variant="label">{t('list.model')}</Txt>
          <View style={styles.wrapChips}>
            <Chip label={t('list.anyModel')} selected={!draft.model} onPress={() => setDraft((d) => ({ ...d, model: null }))} />
            {CAR_MODELS.map((m) => <Chip key={m.slug} label={m.name} selected={draft.model === m.slug} onPress={() => setDraft((d) => ({ ...d, model: m.slug }))} />)}
          </View>
        </View>
      ) : null}
      <View style={styles.group}>
        <Txt variant="label">{t('list.price')}</Txt>
        <View style={styles.priceRow}>
          <View style={styles.flex}><Field placeholder={t('list.priceFrom')} keyboardType="number-pad" value={draft.minPrice != null ? String(draft.minPrice) : ''} onChangeText={(s) => setDraft((d) => ({ ...d, minPrice: num(s) }))} /></View>
          <View style={styles.flex}><Field placeholder={t('list.priceTo')} keyboardType="number-pad" value={draft.maxPrice != null ? String(draft.maxPrice) : ''} onChangeText={(s) => setDraft((d) => ({ ...d, maxPrice: num(s) }))} /></View>
        </View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  flex2: { flex: 2 },
  bar: { backgroundColor: colors.white, paddingTop: 10, paddingBottom: 10 },
  chips: { paddingHorizontal: 16, gap: 8 },
  tool: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.tint },
  toolOn: { backgroundColor: colors.primary },
  list: { paddingTop: 12, paddingBottom: 32, gap: 10 },
  skeletons: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16 },
  sortRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  footer: { flexDirection: 'row', gap: 10 },
  group: { gap: 10, marginTop: 6 },
  wrapChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  priceRow: { flexDirection: 'row', gap: 10 },
});
