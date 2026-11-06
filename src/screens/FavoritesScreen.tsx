import { router } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductCard } from '../components/shop/ProductCard';
import { useGrid } from '../components/shop/ProductGrid';
import { EmptyState } from '../components/ui/EmptyState';
import { Txt } from '../components/ui/Txt';
import type { Product } from '../domain/products';
import { useT } from '../i18n';
import { catalogStore } from '../state/catalog';
import { useStore } from '../lib/store';
import { useFavorites } from '../state/prefs';
import { colors } from '../theme/tokens';

export default function FavoritesScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const ids = useFavorites();
  const byId = useStore(catalogStore, (s) => s.byId);
  const list = useMemo(() => [...ids].reverse().map((id) => byId.get(id)).filter((p): p is Product => !!p), [ids, byId]);
  const { columns, cardWidth, gap } = useGrid();
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.titleRow}>
        <Txt variant="title" style={styles.flex}>{t('fav.title')}</Txt>
        {list.length ? <Txt variant="small">{t('fav.count', { n: list.length })}</Txt> : null}
      </View>
      <FlatList
        key={columns}
        data={list}
        numColumns={columns}
        keyExtractor={(p) => p.id}
        columnWrapperStyle={columns > 1 ? { gap, paddingHorizontal: 16 } : undefined}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="heart-outline" title={t('fav.emptyTitle')} text={t('fav.emptyText')} action={{ label: t('cart.toCatalog'), onPress: () => router.navigate('/') }} />}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 50).duration(320)} exiting={ZoomOut.duration(200)} layout={LinearTransition.springify().damping(18)}>
            <ProductCard product={item} width={cardWidth} />
          </Animated.View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10 },
  list: { paddingTop: 4, paddingBottom: 32, gap: 10 },
});
