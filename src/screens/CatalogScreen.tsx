import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, CartNotice, ConnectionStatus, EmptyState, ScreenHeader } from '../components/ShopUI';
import { useShop } from '../store/ShopProvider';
import { categoryLabel, filterProducts, formatMoney, type Product } from '../store/shop';
import { colors, ui } from '../theme';

const ProductCard = memo(function ProductCard({ product, quantity, ready, onAdd }: {
  product: Product; quantity: number; ready: boolean; onAdd: (id: string) => void;
}) {
  const full = quantity >= product.qoldiq;
  const label = product.qoldiq === 0 ? 'Qoldiq yo‘q' : full ? 'Qoldiq chegarasiga yetdi' : 'Savatga';
  return (
    <View style={ui.card}>
      <Text style={ui.category}>{categoryLabel(product.kategoriya)}</Text>
      <Text style={ui.name}>{product.nomi}</Text>
      <Text style={ui.price}>{formatMoney(product.narxi)}</Text>
      <View style={ui.row}>
        <Text style={ui.secondary}>Qoldiq: {product.qoldiq} dona</Text>
        {quantity > 0 && <Text style={styles.inCart}>Savatda: {quantity}</Text>}
      </View>
      <ActionButton label={label} accessibilityLabel={`${product.nomi}: ${label}`} disabled={!ready || full} onPress={() => onAdd(product.id)} />
    </View>
  );
});

export default function CatalogScreen() {
  const { state, dispatch } = useShop();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const categories = useMemo(() => [...new Set(state.products.map((p) => p.kategoriya))].sort(), [state.products]);
  const selectedCategory = category !== null && categories.includes(category) ? category : null;
  const products = useMemo(() => filterProducts(state.products, query, selectedCategory), [state.products, query, selectedCategory]);
  const add = useCallback((id: string) => dispatch({ type: 'quantity', id, delta: 1 }), [dispatch]);
  const reset = () => { setQuery(''); setCategory(null); };

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <View style={ui.body}>
        <ScreenHeader title="Katalog" subtitle="Kerakli ehtiyot qismni toping" />
        <View style={styles.searchRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Mahsulot nomini yozing…"
            placeholderTextColor={colors.muted}
            accessibilityLabel="Mahsulot nomi bo‘yicha qidiruv"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={Keyboard.dismiss}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable accessibilityRole="button" accessibilityLabel="Qidiruvni tozalash" onPress={() => setQuery('')} style={({ pressed }) => [styles.clear, pressed && ui.pressed]}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          )}
        </View>
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.categories}>
            {[null, ...categories].map((item) => {
              const selected = item === selectedCategory;
              return (
                <Pressable key={item === null ? 'all' : `category:${item}`} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setCategory(item)} style={({ pressed }) => [styles.chip, selected && styles.selectedChip, pressed && ui.pressed]}>
                  <Text style={[styles.chipText, selected && styles.selectedText]}>{item === null ? 'Barchasi' : categoryLabel(item)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
        <ConnectionStatus />
        <CartNotice />
        <Text style={styles.resultCount} accessibilityLiveRegion="polite">{products.length} ta mahsulot</Text>
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          extraData={state.quantities}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[ui.list, products.length === 0 && ui.emptyList]}
          renderItem={({ item }) => <ProductCard product={item} quantity={state.quantities[item.id] ?? 0} ready={state.status === 'ready'} onAdd={add} />}
          ListEmptyComponent={state.status === 'ready' ? (
            <EmptyState title={state.products.length ? 'Mahsulot topilmadi' : 'Katalog hozircha bo‘sh'} message={state.products.length ? 'Boshqa nom bilan qidiring yoki kategoriyani o‘zgartiring.' : state.message} action={state.products.length ? { label: 'Barchasini ko‘rsatish', onPress: reset } : undefined} />
          ) : undefined}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchRow: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center' },
  searchInput: { flex: 1, minHeight: 52, paddingHorizontal: 16, paddingVertical: 13, color: colors.text, fontSize: 16 },
  clear: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  clearText: { fontSize: 25, color: colors.text },
  categories: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, gap: 8 },
  chip: { minHeight: 44, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 22, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, justifyContent: 'center' },
  selectedChip: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '500' },
  selectedText: { fontWeight: '700' },
  resultCount: { color: colors.muted, fontSize: 13, fontWeight: '600', marginHorizontal: 20, marginBottom: 12 },
  inCart: { color: colors.text, fontSize: 13, fontWeight: '600', flexShrink: 1 },
});
