import { FlatList, StyleSheet, View } from 'react-native';

import type { Product } from '../../domain/products';
import { SectionTitle } from '../ui/Controls';
import { ProductCard, ProductCardSkeleton } from './ProductCard';

/**
 * Gorizontal tovarlar qatori (Aksiyalar, Ommabop, O'xshash…).
 * Kartalar kirish animatsiyasisiz: surilganda yangi kartalar "uchib kirmaydi", arzon telefonda ham silliq.
 */
export function ProductRail({ title, products, onSeeAll, seeAllLabel, loading, cardWidth = 156 }: {
  title: string; products: Product[]; onSeeAll?: () => void; seeAllLabel?: string; loading?: boolean; cardWidth?: number;
}) {
  if (!loading && products.length === 0) return null;
  return (
    <View style={styles.wrap}>
      <SectionTitle title={title} action={seeAllLabel} onAction={onSeeAll} />
      <FlatList
        horizontal
        data={loading ? [] : products.slice(0, 16)}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        initialNumToRender={3}
        windowSize={5}
        ListEmptyComponent={loading ? <View style={styles.row}>{[0, 1, 2].map((i) => <ProductCardSkeleton key={i} width={cardWidth} />)}</View> : undefined}
        renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  // Pastdagi joy — kartalar soyasi kesilmasligi uchun.
  list: { paddingHorizontal: 16, gap: 10, paddingTop: 2, paddingBottom: 8 },
  row: { flexDirection: 'row', gap: 10 },
});
