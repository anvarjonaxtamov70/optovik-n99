import { useLocalSearchParams } from 'expo-router';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { FlatList, Keyboard, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useCategories } from '../components/shop/CatalogBits';
import { ProductCard } from '../components/shop/ProductCard';
import { useGrid } from '../components/shop/ProductGrid';
import { Chip } from '../components/ui/Controls';
import { EmptyState } from '../components/ui/EmptyState';
import { goBack } from '../components/ui/Header';
import { Icon } from '../components/ui/Icon';
import { IconButton } from '../components/ui/IconButton';
import { PressableScale } from '../components/ui/PressableScale';
import { Txt } from '../components/ui/Txt';
import { applyFilters, type Product } from '../domain/products';
import { CAR_MODELS } from '../domain/taxonomy';
import { useT } from '../i18n';
import { openList } from '../lib/nav';
import { useProducts } from '../state/catalog';
import { prefs, useRecent } from '../state/prefs';
import { colors, fonts, radius } from '../theme/tokens';

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const products = useProducts();
  const recent = useRecent();
  const categories = useCategories(products);
  const { columns, cardWidth, gap } = useGrid();
  const [query, setQuery] = useState(params.q ?? '');
  const deferred = useDeferredValue(query);
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  useEffect(() => { const id = setTimeout(() => input.current?.focus(), 250); return () => clearTimeout(id); }, []);
  const results = useMemo(() => (deferred.trim().length ? applyFilters(products, { query: deferred }) : []), [products, deferred]);
  const active = query.trim().length > 0;
  const submit = (q = query) => { prefs.addRecent(q); Keyboard.dismiss(); };
  const pick = (q: string) => { setQuery(q); prefs.addRecent(q); };

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <IconButton icon="chevron-back" label={t('common.back')} onPress={() => goBack()} size={40} bg={colors.surfaceAlt} />
        <View style={styles.box}>
          <Icon name="search" size={19} color={colors.primary} />
          <TextInput ref={input} value={query} onChangeText={setQuery} onSubmitEditing={() => submit()} returnKeyType="search"
            placeholder={t('search.placeholder')} placeholderTextColor={colors.faint} style={styles.input} autoCorrect={false} autoCapitalize="none"
            accessibilityLabel={t('search.placeholder')} maxFontSizeMultiplier={1.3} />
          {query ? <IconButton icon="close-circle" label={t('common.reset')} onPress={() => setQuery('')} size={32} bg="transparent" color={colors.faint} iconSize={20} /> : null}
        </View>
      </View>

      {!active ? (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.idle}>
          {recent.length ? (
            <Animated.View entering={FadeIn} style={styles.group}>
              <View style={styles.groupHead}>
                <Txt variant="h3" style={styles.flex}>{t('search.recent')}</Txt>
                <PressableScale onPress={prefs.clearRecent} hitSlop={8} accessibilityLabel={t('search.clearRecent')}><Txt variant="smallStrong" color={colors.primary}>{t('search.clearRecent')}</Txt></PressableScale>
              </View>
              {recent.map((r) => (
                <PressableScale key={r} onPress={() => pick(r)} style={styles.recent} accessibilityLabel={r}>
                  <Icon name="time-outline" size={18} color={colors.faint} />
                  <Txt variant="body" style={styles.flex} numberOfLines={1}>{r}</Txt>
                  <Icon name="arrow-up-outline" size={16} color={colors.faint} />
                </PressableScale>
              ))}
            </Animated.View>
          ) : null}
          <Animated.View entering={FadeInDown.delay(60)} style={styles.group}>
            <Txt variant="h3">{t('search.popular')}</Txt>
            <View style={styles.chips}>
              {CAR_MODELS.slice(0, 8).map((m) => <Chip key={m.slug} label={m.name} partIcon="car-side" onPress={() => openList({ model: m.slug, title: m.name })} />)}
            </View>
            <View style={styles.chips}>
              {categories.slice(0, 10).map((c) => <Chip key={c.key} label={c.label} partIcon={c.icon} onPress={() => openList({ category: c.key, title: c.label })} />)}
            </View>
          </Animated.View>
          <View style={styles.hint}>
            <Icon name="barcode-outline" size={20} color={colors.primary} />
            <Txt variant="small" style={styles.flex}>{t('search.hint')}</Txt>
          </View>
        </ScrollView>
      ) : (
        <FlatList
          key={columns}
          data={results}
          numColumns={columns}
          keyExtractor={(p: Product) => p.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onScrollBeginDrag={() => submit()}
          columnWrapperStyle={columns > 1 ? { gap, paddingHorizontal: 16 } : undefined}
          contentContainerStyle={styles.list}
          ListHeaderComponent={results.length ? <Txt variant="small" style={styles.count}>{t('search.results', { n: results.length })}</Txt> : undefined}
          ListEmptyComponent={<EmptyState icon="search-outline" title={t('search.noResults')} text={t('search.noResultsText')} compact />}
          renderItem={({ item, index }) => (
            <Animated.View entering={index < 6 ? FadeInDown.delay(index * 40).duration(280) : undefined}>
              <ProductCard product={item} width={cardWidth} />
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingBottom: 12, backgroundColor: colors.white },
  box: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, paddingLeft: 14, paddingRight: 4, borderWidth: 1.5, borderColor: colors.primary },
  input: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink, paddingVertical: 10, ...Platform.select({ web: { outlineWidth: 0 }, default: {} }) },
  idle: { padding: 16, gap: 22 },
  group: { gap: 10 },
  groupHead: { flexDirection: 'row', alignItems: 'center' },
  recent: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.md, backgroundColor: colors.tint },
  list: { paddingTop: 12, paddingBottom: 32, gap: 10 },
  count: { paddingHorizontal: 16, marginBottom: 2 },
});
