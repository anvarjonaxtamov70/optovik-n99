import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ADMIN_WIDE, useAdminShell } from '../../components/admin/AdminShell';
import { ProductImage } from '../../components/shop/ProductImage';
import { Button } from '../../components/ui/Button';
import { Chip, Pill } from '../../components/ui/Controls';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { Header } from '../../components/ui/Header';
import { Icon } from '../../components/ui/Icon';
import { IconButton } from '../../components/ui/IconButton';
import { PressableScale } from '../../components/ui/PressableScale';
import { Txt } from '../../components/ui/Txt';
import { applyFilters, LOW_STOCK, parseWhole, type Product } from '../../domain/products';
import { categoryLabel } from '../../domain/taxonomy';
import { useT } from '../../i18n';
import { classifyError } from '../../lib/firebase';
import { quickUpdate } from '../../state/admin';
import { useProducts } from '../../state/catalog';
import { showToast } from '../../state/toast';
import { colors, fonts, radius, shadow } from '../../theme/tokens';

type Only = 'low' | 'out' | 'sale' | 'noImage' | null;

export default function AdminProducts() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= ADMIN_WIDE;
  const { sidebar } = useAdminShell();
  const { t, money, lang } = useT();
  const products = useProducts();
  const [q, setQ] = useState('');
  const [only, setOnly] = useState<Only>(null);
  const [cat, setCat] = useState<string | null>(null);
  const cats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.kategoriya, (counts.get(p.kategoriya) ?? 0) + 1);
    return [...counts.entries()].map(([slug, n]) => ({ slug, n, label: categoryLabel(slug, lang) })).sort((a, b) => a.label.localeCompare(b.label));
  }, [products, lang]);
  const list = useMemo(() => applyFilters(products, { query: q, sale: only === 'sale', category: cat })
    .filter((p) => only !== 'low' || (p.qoldiq > 0 && p.qoldiq <= LOW_STOCK))
    .filter((p) => only !== 'out' || p.qoldiq <= 0)
    .filter((p) => only !== 'noImage' || !p.rasmlar.length), [products, q, only, cat]);
  const toggle = (v: Only) => setOnly(only === v ? null : v);
  const add = () => router.push('/admin/product');

  const catChips = [
    <Chip key="all" label={t('common.all')} count={products.length} selected={!cat} onPress={() => setCat(null)} />,
    ...cats.map((c) => <Chip key={c.slug} label={c.label} count={c.n} selected={cat === c.slug} onPress={() => setCat(cat === c.slug ? null : c.slug)} />),
  ];

  return (
    <View style={styles.root}>
      <Header title={t('admin.products')} subtitle={t('admin.productsCount', { n: list.length })} back={!sidebar}
        right={wide ? <Button title={t('admin.addProduct')} icon="add" size="sm" full={false} onPress={add} /> : undefined} />
      <View style={styles.bar}>
        <View style={[styles.barInner, wide && styles.wideInner]}>
          <Field icon="search" placeholder={t('admin.searchProducts')} value={q} onChangeText={setQ} autoCapitalize="none" />
          <View style={styles.chips}>
            <Chip label={t('admin.lowStock')} selected={only === 'low'} onPress={() => toggle('low')} />
            <Chip label={t('admin.outOfStock')} selected={only === 'out'} onPress={() => toggle('out')} />
            <Chip label={t('home.sale')} selected={only === 'sale'} onPress={() => toggle('sale')} />
            <Chip label={t('admin.filter.noImage')} icon="image-outline" selected={only === 'noImage'} onPress={() => toggle('noImage')} />
          </View>
          {wide
            ? <View style={styles.chips}>{catChips}</View>
            : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>{catChips}</ScrollView>}
        </View>
      </View>
      <FlatList
        data={list}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, wide && styles.wideInner, { paddingBottom: insets.bottom + (wide ? 30 : 100) }]}
        initialNumToRender={16}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={wide && list.length ? (
          <View style={styles.tableHead}>
            <Txt variant="label" style={styles.flex}>{t('admin.product.title')}</Txt>
            <Txt variant="label" style={styles.colPrice}>{t('admin.product.price')}</Txt>
            <Txt variant="label" style={styles.colStock}>{t('admin.product.stock')}</Txt>
            <View style={styles.colGo} />
          </View>
        ) : undefined}
        ListFooterComponent={wide && list.length ? <Txt variant="tiny" center style={styles.hint}>{t('admin.quick.hint')}</Txt> : undefined}
        ListEmptyComponent={<EmptyState icon="cube-outline" title={t('list.emptyTitle')} compact />}
        renderItem={({ item }) => wide
          ? <WideRow p={item} label={categoryLabel(item.kategoriya, lang)} />
          : <Row p={item} money={money} label={categoryLabel(item.kategoriya, lang)} pcs={t('common.pcs')} out={t('admin.outOfStock')} />}
      />
      {!wide ? (
        <View style={[styles.fab, { bottom: insets.bottom + 16 }]}>
          <Button title={t('admin.addProduct')} icon="add" size="lg" onPress={add} />
        </View>
      ) : null}
    </View>
  );
}

const open = (p: Product) => router.push({ pathname: '/admin/product', params: { id: p.id } });

function Row({ p, money, label, pcs, out }: { p: Product; money: (v: number) => string; label: string; pcs: string; out: string }) {
  return (
    <PressableScale onPress={() => open(p)} scaleTo={0.98} style={[styles.row, shadow.soft]} accessibilityLabel={p.nomi}>
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

/** Noutbuk uchun jadval qatori: narx va qoldiq shu yerning o'zida o'zgartiriladi. */
const WideRow = memo(function WideRow({ p, label }: { p: Product; label: string }) {
  const { t } = useT();
  const [saving, setSaving] = useState(false);
  const commit = async (patch: { narxi?: number; qoldiq?: number }) => {
    setSaving(true);
    try {
      await quickUpdate(p, patch);
    } catch (e) {
      showToast(classifyError(e) === 'permission' ? t('admin.product.conflict') : t('common.error'), { kind: 'error' });
    } finally {
      setSaving(false);
    }
  };
  return (
    <View style={[styles.wideRow, shadow.soft]}>
      <PressableScale onPress={() => open(p)} scaleTo={0.99} style={styles.wideMain} accessibilityLabel={p.nomi}>
        <ProductImage uri={p.rasmlar[0]} kategoriya={p.kategoriya} seed={p.id} style={styles.thumbSm} iconScale={0.45} />
        <View style={styles.flex}>
          <Txt variant="smallStrong" numberOfLines={1}>{p.nomi}</Txt>
          <View style={styles.meta}>
            <Txt variant="tiny" numberOfLines={1}>{label}{p.artikul ? ` · ${p.artikul}` : ''}</Txt>
            {!p.rasmlar.length ? <Pill text={t('admin.filter.noImage')} tone="muted" /> : null}
            {p.eskiNarx ? <Pill text={t('home.sale')} tone="sale" /> : null}
          </View>
        </View>
      </PressableScale>
      <View style={styles.colPrice}>
        <QuickNumber key={`n${p.narxi}`} value={p.narxi} max={1_000_000_000} label={`${p.nomi}: ${t('admin.product.price')}`} onCommit={(n) => commit({ narxi: n })} />
      </View>
      <View style={[styles.colStock, styles.stock]}>
        <IconButton icon="remove" label="−1" size={34} bg={colors.surfaceAlt} color={colors.ink} onPress={() => p.qoldiq > 0 && void commit({ qoldiq: p.qoldiq - 1 })} />
        <View style={styles.flex}>
          <QuickNumber key={`q${p.qoldiq}`} value={p.qoldiq} max={1_000_000} label={`${p.nomi}: ${t('admin.product.stock')}`} onCommit={(n) => commit({ qoldiq: n })}
            tone={p.qoldiq <= 0 ? 'sale' : p.qoldiq <= LOW_STOCK ? 'warning' : undefined} />
        </View>
        <IconButton icon="add" label="+1" size={34} bg={colors.surfaceAlt} color={colors.ink} onPress={() => void commit({ qoldiq: p.qoldiq + 1 })} />
      </View>
      <View style={styles.colGo}>
        {saving ? <ActivityIndicator color={colors.primary} /> : (
          <PressableScale onPress={() => open(p)} accessibilityLabel={t('common.edit')} style={styles.go}>
            <Icon name="chevron-forward" size={18} color={colors.faint} />
          </PressableScale>
        )}
      </View>
    </View>
  );
});

/** Raqam maydoni: Enter yoki boshqa joyga o'tganda saqlanadi, Esc — bekor. */
function QuickNumber({ value, max, label, onCommit, tone }: { value: number; max: number; label: string; onCommit: (n: number) => void; tone?: 'sale' | 'warning' }) {
  const { t } = useT();
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const submit = () => {
    const n = parseWhole(text, max);
    if (n === null) { showToast(t('admin.quick.invalid'), { kind: 'error' }); setText(String(value)); return; }
    if (n !== value) onCommit(n);
  };
  return (
    <TextInput
      value={text}
      onChangeText={(v) => setText(v.replace(/[^\d\s]/g, ''))}
      onSubmitEditing={submit}
      onFocus={() => setFocused(true)}
      onBlur={() => { setFocused(false); submit(); }}
      onKeyPress={(e) => { if (e.nativeEvent.key === 'Escape') setText(String(value)); }}
      keyboardType="number-pad"
      selectTextOnFocus
      accessibilityLabel={label}
      style={[styles.quick, focused && styles.quickFocus, tone === 'sale' && { color: colors.sale }, tone === 'warning' && { color: colors.warning }]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1, minWidth: 0 },
  bar: { backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  barInner: { gap: 10, width: '100%', alignSelf: 'center' },
  wideInner: { maxWidth: 1240, width: '100%', alignSelf: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chipsScroll: { gap: 8 },
  list: { padding: 16, gap: 10 },
  row: { flexDirection: 'row', gap: 12, padding: 10, borderRadius: radius.lg, backgroundColor: colors.white, alignItems: 'center' },
  thumb: { width: 64, height: 64, borderRadius: radius.md },
  thumbSm: { width: 48, height: 48, borderRadius: radius.sm },
  rowBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, gap: 8 },
  fab: { position: 'absolute', left: 16, right: 16 },
  tableHead: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 12, paddingBottom: 2 },
  wideRow: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.md, backgroundColor: colors.white },
  wideMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  colPrice: { width: 150 },
  colStock: { width: 170 },
  colGo: { width: 36, alignItems: 'center' },
  stock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  go: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  quick: {
    height: 40, borderRadius: radius.sm, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surfaceAlt, paddingHorizontal: 10,
    fontFamily: fonts.bold, fontSize: 15, color: colors.ink, textAlign: 'right', minWidth: 0,
    ...Platform.select({ web: { outlineWidth: 0, outlineStyle: 'none' } as object, default: {} }),
  },
  quickFocus: { borderColor: colors.primary, backgroundColor: colors.white },
  hint: { marginTop: 6 },
});
