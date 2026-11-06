import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductImage } from '../../components/shop/ProductImage';
import { Button } from '../../components/ui/Button';
import { Chip, Pill } from '../../components/ui/Controls';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { Header } from '../../components/ui/Header';
import { PressableScale } from '../../components/ui/PressableScale';
import { Txt } from '../../components/ui/Txt';
import { applyFilters, LOW_STOCK, type Product } from '../../domain/products';
import { categoryLabel } from '../../domain/taxonomy';
import { useT } from '../../i18n';
import { useProducts } from '../../state/catalog';
import { colors, radius, shadow } from '../../theme/tokens';

export default function AdminProducts() {
  const insets = useSafeAreaInsets();
  const { t, money, lang } = useT();
  const products = useProducts();
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<'low' | 'sale' | null>(null);
  const list = useMemo(() => applyFilters(products, { query: q, sale: only === 'sale' }).filter((p) => only !== 'low' || p.qoldiq <= LOW_STOCK), [products, q, only]);
  return (
    <View style={styles.root}>
      <Header title={t('admin.products')} subtitle={t('admin.productsCount', { n: list.length })} />
      <View style={styles.bar}>
        <Field icon="search" placeholder={t('admin.searchProducts')} value={q} onChangeText={setQ} autoCapitalize="none" />
        <View style={styles.chips}>
          <Chip label={t('admin.lowStock')} selected={only === 'low'} onPress={() => setOnly(only === 'low' ? null : 'low')} />
          <Chip label={t('home.sale')} selected={only === 'sale'} onPress={() => setOnly(only === 'sale' ? null : 'sale')} />
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        initialNumToRender={12}
        ListEmptyComponent={<EmptyState icon="cube-outline" title={t('list.emptyTitle')} compact />}
        renderItem={({ item }) => <Row p={item} money={money} label={categoryLabel(item.kategoriya, lang)} pcs={t('common.pcs')} out={t('admin.outOfStock')} />}
      />
      <View style={[styles.fab, { bottom: insets.bottom + 16 }]}>
        <Button title={t('admin.addProduct')} icon="add" size="lg" onPress={() => router.push('/admin/product')} />
      </View>
    </View>
  );
}

function Row({ p, money, label, pcs, out }: { p: Product; money: (v: number) => string; label: string; pcs: string; out: string }) {
  return (
    <PressableScale onPress={() => router.push({ pathname: '/admin/product', params: { id: p.id } })} scaleTo={0.98} style={[styles.row, shadow.soft]} accessibilityLabel={p.nomi}>
      <ProductImage uri={p.rasmlar[0]} kategoriya={p.kategoriya} seed={p.id} style={styles.thumb} iconScale={0.45} />
      <View style={styles.flex}>
        <Txt variant="smallStrong" numberOfLines={2}>{p.nomi}</Txt>
        <Txt variant="tiny" numberOfLines={1}>{label}{p.artikul ? ` · ${p.artikul}` : ''}</Txt>
        <View style={styles.rowBottom}>
          <Txt variant="bodyStrong" color={p.eskiNarx ? colors.sale : colors.ink}>{money(p.narxi)}</Txt>
          <Pill text={p.qoldiq ? `${p.qoldiq} ${p.birlik ?? pcs}` : out} tone={p.qoldiq <= 0 ? 'sale' : p.qoldiq <= LOW_STOCK ? 'warning' : 'success'} />
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  bar: { backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  chips: { flexDirection: 'row', gap: 8 },
  list: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: radius.lg, backgroundColor: colors.white, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8 },
  fab: { position: 'absolute', left: 16, right: 16 },
});
