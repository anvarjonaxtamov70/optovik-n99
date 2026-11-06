import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { Product } from '../../domain/products';
import { CAR_MODELS, CATEGORIES, categoryFor, categoryIcon, categoryLabel, type CarModel } from '../../domain/taxonomy';
import { useT } from '../../i18n';
import { openList } from '../../lib/nav';
import { retryCatalog, useCatalogStatus, usePlaceholderCatalog } from '../../state/catalog';
import { colors, gradients, radius, shadow } from '../../theme/tokens';
import { Icon, PartIcon, type IconName } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { Txt } from '../ui/Txt';

export type CategoryEntry = { key: string; label: string; icon: string; count: number };

/** Katalogdagi kategoriyalar (taksonomiya tartibida) + soni. Tovar yo'q bo'lsa taksonomiya ko'rsatiladi. */
export function useCategories(products: Product[], group?: 'parts' | 'accessories'): CategoryEntry[] {
  const { lang } = useT();
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) counts.set(p.kategoriya, (counts.get(p.kategoriya) ?? 0) + 1);
    const order = (key: string) => {
      const c = categoryFor(key);
      return c ? CATEGORIES.indexOf(c) : 100;
    };
    let keys = [...counts.keys()];
    if (group) keys = keys.filter((k) => (categoryFor(k)?.group ?? 'parts') === group);
    if (!keys.length) keys = CATEGORIES.filter((c) => !group || c.group === group).map((c) => c.slug);
    return keys
      .sort((a, b) => order(a) - order(b) || a.localeCompare(b))
      .map((key) => ({ key, label: categoryLabel(key, lang), icon: categoryIcon(key), count: counts.get(key) ?? 0 }));
  }, [products, group, lang]);
}

export function CategoryGrid({ items, columns = 4 }: { items: CategoryEntry[]; columns?: number }) {
  return (
    <View style={styles.grid}>
      {items.map((c, i) => (
        <Animated.View key={c.key} entering={FadeInDown.delay(i * 35).duration(320)} style={{ width: `${100 / columns}%` }}>
          <PressableScale onPress={() => openList({ category: c.key, title: c.label })} feedback="tap" accessibilityLabel={c.label} style={styles.cat}>
            <LinearGradient colors={gradients.sky} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.catIcon}>
              <PartIcon name={c.icon} size={28} color={colors.primary} />
            </LinearGradient>
            <Txt variant="tiny" color={colors.ink} center numberOfLines={2} style={styles.catLabel}>{c.label}</Txt>
          </PressableScale>
        </Animated.View>
      ))}
    </View>
  );
}

export function bodyIcon(m: CarModel): string {
  return m.body === 'van' ? 'van-utility' : m.body === 'pickup' ? 'car-pickup' : m.body === 'suv' ? 'car-estate' : m.body === 'hatch' ? 'car-hatchback' : 'car-side';
}

export function ModelRail({ selected, onSelect }: { selected?: string | null; onSelect?: (m: CarModel) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.models}>
      {CAR_MODELS.slice(0, 12).map((m) => {
        const on = selected === m.slug;
        return (
          <PressableScale key={m.slug} feedback="tap" accessibilityLabel={m.name} accessibilityState={{ selected: on }}
            onPress={() => (onSelect ? onSelect(m) : openList({ model: m.slug, title: m.name }))}
            style={[styles.model, on ? styles.modelOn : null, shadow.soft]}>
            <PartIcon name={bodyIcon(m)} size={30} color={on ? colors.white : colors.primary} />
            <Txt variant="smallStrong" color={on ? colors.white : colors.ink} numberOfLines={1}>{m.name}</Txt>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

export function SearchPill({ placeholder, onPress }: { placeholder: string; onPress?: () => void }) {
  return (
    <PressableScale onPress={onPress ?? (() => router.push('/search'))} scaleTo={0.985} accessibilityRole="search" accessibilityLabel={placeholder} style={styles.search}>
      <Icon name="search" size={20} color={colors.primary} />
      <Txt variant="body" color={colors.faint} numberOfLines={1} style={styles.flex}>{placeholder}</Txt>
      <View style={styles.searchCode}><Icon name="barcode-outline" size={18} color={colors.muted} /></View>
    </PressableScale>
  );
}

/** Internet yo'q / katalog bo'sh / namuna katalog haqida yumshoq ogohlantirish. */
export function CatalogNotice() {
  const status = useCatalogStatus();
  const placeholder = usePlaceholderCatalog();
  const { t } = useT();
  if (status === 'offline' || status === 'error') {
    return <Notice icon="cloud-offline-outline" text={t('common.offline')} action={t('common.retry')} onAction={retryCatalog} />;
  }
  if (placeholder) return <Notice icon="construct-outline" text={t('home.placeholderCatalog')} tone="warning" />;
  return null;
}

export function Notice({ icon, text, action, onAction, tone = 'info' }: { icon: IconName; text: string; action?: string; onAction?: () => void; tone?: 'info' | 'warning' }) {
  return (
    <Animated.View entering={FadeInDown.duration(260)} style={[styles.notice, tone === 'warning' && styles.noticeWarn]}>
      <Icon name={icon} size={20} color={tone === 'warning' ? colors.warning : colors.primary} />
      <Txt variant="small" color={colors.text} style={styles.flex}>{text}</Txt>
      {action && onAction ? (
        <PressableScale onPress={onAction} hitSlop={8} accessibilityLabel={action}><Txt variant="smallStrong" color={colors.primary}>{action}</Txt></PressableScale>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, rowGap: 6 },
  cat: { alignItems: 'center', gap: 6, paddingHorizontal: 4, paddingVertical: 4 },
  catIcon: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  catLabel: { lineHeight: 14, minHeight: 28 },
  models: { paddingHorizontal: 16, gap: 10, paddingVertical: 4 },
  model: { width: 92, height: 82, borderRadius: radius.lg, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', gap: 4 },
  modelOn: { backgroundColor: colors.primary },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 48, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, paddingLeft: 14, paddingRight: 6, borderWidth: 1, borderColor: colors.line },
  searchCode: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, padding: 12, borderRadius: radius.md, backgroundColor: colors.tint },
  noticeWarn: { backgroundColor: colors.warningSoft },
});
