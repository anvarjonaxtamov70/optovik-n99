import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartNotice, ConnectionStatus, EmptyState, ScreenHeader } from '../components/ShopUI';
import { Field, Message, Pill, ProductCard } from '../components/StoreUI';
import { useShop } from '../store/ShopProvider';
import { categoryLabel, filterProducts } from '../store/shop';
import { colors, ui } from '../theme';

export default function CatalogScreen() {
  const { state, storageProblem, retry } = useShop();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState('Barchasi');
  const [sort, setSort] = useState(false);
  const categories = useMemo(() => [...new Set(state.products.map((p) => p.kategoriya))], [state.products]);
  const products = useMemo(() => {
    const result = filterProducts(state.products, query, category).filter((p) => filter === 'Mavjud' ? p.qoldiq > 0 : filter === 'Aksiyalar' ? !!p.eskiNarx : true);
    return sort ? result.sort((a, b) => a.narxi - b.narxi) : result;
  }, [state.products, query, category, filter, sort]);
  return <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}><View style={ui.body}>
    <FlatList data={products} keyExtractor={(p) => p.id} numColumns={2} columnWrapperStyle={{ gap: 12 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 12 }}
      refreshing={state.status === 'loading'} onRefresh={retry} initialNumToRender={8} windowSize={7}
      ListHeaderComponent={<View style={{ gap: 16 }}>
        <ScreenHeader title="Ehtiyot qismlar" subtitle="Avtomobilingiz uchun kerakli detal" />
        <View style={styles.hero}><Text style={styles.eyebrow}>OPTOVIK N99 · AVTODO‘KON</Text><Text style={styles.heroTitle}>Ishonchli detal.{ '\n' }Ishonchli yo‘l.</Text><Text style={styles.heroText}>Narx va ombor qoldig‘i — doim yangilanadi.</Text></View>
        <Field label="Qidirish" placeholder="Nomi, artikuli yoki avtomobil modeli" value={query} onChangeText={setQuery} clearButtonMode="while-editing" autoCorrect={false} returnKeyType="search" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pill text="Barcha bo‘limlar" selected={category === null} onPress={() => setCategory(null)} />
          {categories.map((c) => <Pill key={c} text={categoryLabel(c)} selected={category === c} onPress={() => setCategory(c)} />)}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {['Barchasi', 'Mavjud', 'Aksiyalar'].map((x) => <Pill key={x} text={x} selected={filter === x} onPress={() => setFilter(x)} />)}
          <Pill text="Arzonidan ↑" selected={sort} onPress={() => setSort(!sort)} />
        </ScrollView>
        <ConnectionStatus /><CartNotice />
        {storageProblem && <Message text="Telefon xotirasiga saqlab bo‘lmadi. Savat ilova yopilganda saqlanmasligi mumkin." />}
        <View style={ui.row}><Text style={ui.name}>Katalog</Text><Text style={ui.secondary}>{products.length} ta mahsulot</Text></View>
      </View>}
      ListEmptyComponent={<EmptyState title={state.status === 'loading' ? 'Yuklanmoqda…' : 'Mahsulot topilmadi'} message={state.products.length ? 'Qidiruv yoki filtrni o‘zgartirib ko‘ring.' : state.message} />}
      renderItem={({ item }) => <ProductCard product={item} />} />
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  hero: { padding: 24, borderRadius: 26, backgroundColor: colors.accent, gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 1.7, color: '#dcefff' },
  heroTitle: { fontSize: 29, lineHeight: 35, fontWeight: '800', color: colors.white },
  heroText: { fontSize: 14, lineHeight: 21, color: '#e0f2ff', maxWidth: 240 },
});
