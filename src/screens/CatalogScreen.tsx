import { useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CatalogBanners } from '../components/CatalogBanners';
import { CatalogFilters } from '../components/CatalogFilters';
import { CatalogHeader } from '../components/CatalogHeader';
import { CompareTray } from '../components/CompareTray';
import { Icon, type IconName } from '../components/Icon';
import { CartNotice, ConnectionStatus, EmptyState } from '../components/ShopUI';
import { Message, Pill, ProductCard } from '../components/StoreUI';
import { useProductGrid } from '../components/useProductGrid';
import { defaultCatalogOptions, matchesDepartment, selectCatalog, type CatalogOptions, type Department } from '../store/catalog';
import { useShop } from '../store/ShopProvider';
import { categoryLabel, filterProducts } from '../store/shop';
import { colors, ui } from '../theme';

function categoryIcon(value: string): IconName {
  if (/aksess|access|salon/i.test(value)) return 'car';
  if (/motor|dvigatel|filtr/i.test(value)) return 'engine';
  if (/tormoz|brake/i.test(value)) return 'brake';
  if (/elektr|svecha/i.test(value)) return 'bolt';
  return 'box';
}
export default function CatalogScreen() {
  const { state, storageProblem, retry } = useShop();
  const { columns, cardWidth } = useProductGrid();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [department, setDepartment] = useState<Department>('all');
  const [options, setOptions] = useState<CatalogOptions>(defaultCatalogOptions);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const categories = useMemo(() => [...new Set(state.products.filter((p) => matchesDepartment(p, department)).map((p) => p.kategoriya))], [state.products, department]);
  const products = useMemo(() => selectCatalog(filterProducts(state.products, query, category), department, options), [state.products, query, category, department, options]);
  const filterCount = Number(options.availableOnly) + Number(options.saleOnly) + Number(options.sort !== 'default');
  const filtered = !!query.trim() || !!category || department !== 'all' || filterCount > 0;
  const loading = state.status === 'loading' && state.products.length === 0;
  const chooseDepartment = (next: Department) => { Keyboard.dismiss(); setFocused(false); setQuery(''); setCategory(null); setOptions(defaultCatalogOptions); setDepartment(next); };
  const reset = () => { chooseDepartment('all'); };
  const openFilters = () => { Keyboard.dismiss(); setFiltersOpen(true); };
  return <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}><View style={ui.body}>
    <CatalogHeader query={query} onQuery={setQuery} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onFilter={openFilters} filterCount={filterCount} />
    <FlatList key={columns} data={products} keyExtractor={(p) => p.id} numColumns={columns} columnWrapperStyle={columns === 2 ? styles.columns : undefined}
      contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      refreshing={state.status === 'loading' && state.products.length > 0} onRefresh={retry} initialNumToRender={6} windowSize={7}
      ListHeaderComponent={<View style={styles.header}>
        {!query.trim() && !focused && department === 'all' && <CatalogBanners onGM={() => chooseDepartment('gm')} onAccessories={() => chooseDepartment('accessories')} />}
        {department !== 'all' && <View style={styles.department}><Text style={styles.departmentTitle}>{department === 'gm' ? 'GM ehtiyot qismlari' : 'Avtoaksessuarlar'}</Text><Pressable onPress={reset} style={styles.reset} accessibilityRole="button"><Text style={styles.resetText}>Barchasi</Text><Icon name="close" size={15} /></Pressable></View>}
        {categories.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categories} keyboardShouldPersistTaps="handled">
          {[null, ...categories].map((value) => <Pressable key={value ?? 'all'} onPress={() => setCategory(value)} accessibilityRole="button" accessibilityState={{ selected: category === value }} style={({ pressed }) => [styles.category, pressed && ui.pressed]}>
            <View style={[styles.categoryIcon, category === value && styles.categorySelected]}><Icon name={value ? categoryIcon(value) : 'grid'} size={25} /></View>
            <Text style={styles.categoryLabel}>{value ? categoryLabel(value) : 'Barchasi'}</Text>
          </Pressable>)}
        </ScrollView>}
        <ConnectionStatus /><CartNotice />
        {storageProblem && <Message text="Telefon xotirasiga saqlab bo‘lmadi. Savat ilova yopilganda saqlanmasligi mumkin." />}
        <View style={styles.section}><View><Text style={styles.sectionTitle} accessibilityRole="header">{query.trim() ? 'Qidiruv natijalari' : 'Mahsulotlar'}</Text><Text style={styles.count}>{loading ? 'Yuklanmoqda…' : `${products.length} ta mahsulot`}</Text></View>
          <Pressable onPress={openFilters} accessibilityRole="button" accessibilityLabel="Mahsulotlarni saralash" style={({ pressed }) => [styles.sort, pressed && ui.pressed]}><Text style={styles.sortText}>Saralash</Text><Icon name="sort" size={17} /></Pressable>
        </View>
        {filtered && <View style={styles.activeFilters}>
          <Pill text="Filtrlarni tozalash" selected={false} onPress={reset} />
          {options.saleOnly && <Text style={styles.count}>Aksiyalar</Text>}{options.availableOnly && <Text style={styles.count}>Mavjud</Text>}
        </View>}
      </View>}
      ListEmptyComponent={loading ? <View style={styles.skeletons} accessibilityLabel="Mahsulotlar yuklanmoqda">{[0, 1, 2, 3].map((i) => <View key={i} style={[styles.skeleton, { width: cardWidth }]}><View style={styles.skeletonPhoto} /><View style={styles.skeletonLine} /><View style={[styles.skeletonLine, { width: '55%' }]} /></View>)}</View> :
        <EmptyState title="Mahsulot topilmadi" message={state.products.length ? 'Qidiruv, bo‘lim yoki filtrni o‘zgartirib ko‘ring.' : state.message} action={filtered ? { label: 'Barcha mahsulotlar', onPress: reset } : undefined} />}
      renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />} />
    <CompareTray />
    {filtersOpen && <CatalogFilters initial={options} onClose={() => setFiltersOpen(false)} onApply={(next) => { setOptions(next); setFiltersOpen(false); }} />}
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 14 }, columns: { gap: 12 },
  header: { gap: 15 }, categories: { gap: 10, paddingVertical: 3 },
  category: { alignItems: 'center', width: 76, gap: 7 },
  categoryIcon: { width: 60, height: 56, borderRadius: 17, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  categorySelected: { backgroundColor: colors.blue, borderColor: '#63b8e4' },
  categoryLabel: { fontSize: 11, lineHeight: 15, color: colors.text, textAlign: 'center', fontWeight: '600' },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { fontSize: 22, fontWeight: '800', color: colors.text, flexShrink: 1 },
  count: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  sort: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 48, paddingHorizontal: 12, borderRadius: 13, backgroundColor: colors.blueLight },
  sortText: { fontSize: 12, color: colors.text, fontWeight: '600' },
  department: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  departmentTitle: { color: colors.text, fontSize: 20, fontWeight: '800' },
  reset: { flexDirection: 'row', gap: 5, alignItems: 'center', minHeight: 48 }, resetText: { fontSize: 13, color: colors.text },
  activeFilters: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  skeletons: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, skeleton: { borderRadius: 20, backgroundColor: colors.white, paddingBottom: 14, gap: 12 },
  skeletonPhoto: { aspectRatio: 1, backgroundColor: colors.photo, borderRadius: 20 },
  skeletonLine: { height: 14, width: '75%', backgroundColor: colors.photo, marginLeft: 12, borderRadius: 6 },
});
