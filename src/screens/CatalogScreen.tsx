import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTabBarSpace } from '../components/TabBar';

import { bodyIcon, CatalogNotice, SearchPill, useCategories } from '../components/shop/CatalogBits';
import { Segmented } from '../components/ui/Controls';
import { Icon, PartIcon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { Txt } from '../components/ui/Txt';
import { CAR_MODELS } from '../domain/taxonomy';
import { useT } from '../i18n';
import { openList } from '../lib/nav';
import { useProducts } from '../state/catalog';
import { useMyCar } from '../state/prefs';
import { colors, radius, shadow } from '../theme/tokens';

export default function CatalogScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const products = useProducts();
  const car = useMyCar();
  const [group, setGroup] = useState<'parts' | 'accessories'>('parts');
  // Guruh almashtirilgandagina kategoriyalar yumshoq almashadi (ekran ochilganda emas).
  const [switched, setSwitched] = useState(false);
  const categories = useCategories(products, group);
  const tabSpace = useTabBarSpace();
  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Txt variant="title" accessibilityRole="header">{t('catalog.title')}</Txt>
        <SearchPill placeholder={t('home.searchPlaceholder')} />
        <Segmented value={group} onChange={(v) => { setSwitched(true); setGroup(v); }} options={[
          { value: 'parts', label: t('catalog.parts'), icon: 'construct-outline' },
          { value: 'accessories', label: t('catalog.accessories'), icon: 'sparkles-outline' },
        ]} />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabSpace }]} showsVerticalScrollIndicator={false}>
        <CatalogNotice />
        <PressableScale onPress={() => openList({ group, title: group === 'parts' ? t('catalog.parts') : t('catalog.accessories') })} scaleTo={0.98} style={[styles.allRow, shadow.soft]} accessibilityLabel={t('common.all')}>
          <View style={styles.allIcon}><Icon name="apps" size={20} color={colors.white} /></View>
          <Txt variant="bodyStrong" style={styles.flex}>{t('common.all')} — {group === 'parts' ? t('catalog.parts') : t('catalog.accessories')}</Txt>
          <Icon name="chevron-forward" size={18} color={colors.faint} />
        </PressableScale>
        <Animated.View key={group} entering={switched ? FadeIn.duration(180) : undefined} style={styles.grid}>
          {categories.map((c) => (
            <View key={c.key} style={styles.tileWrap}>
              <PressableScale onPress={() => openList({ category: c.key, title: c.label })} feedback="tap" scaleTo={0.96} style={[styles.tile, shadow.soft]} accessibilityLabel={`${c.label}, ${t('catalog.count', { n: c.count })}`}>
                <View style={styles.tileIcon}><PartIcon name={c.icon} size={30} color={colors.primary} /></View>
                <Txt variant="bodyStrong" numberOfLines={2} style={styles.tileLabel}>{c.label}</Txt>
                <Txt variant="tiny">{t('catalog.count', { n: c.count })}</Txt>
              </PressableScale>
            </View>
          ))}
        </Animated.View>

        <Txt variant="h2" style={styles.sectionTitle}>{t('catalog.byModel')}</Txt>
        <View style={styles.models}>
          {CAR_MODELS.map((m) => {
            const count = products.filter((p) => p.modellar.includes(m.slug)).length;
            const mine = car?.model === m.slug;
            return (
              <View key={m.slug} style={styles.modelWrap}>
                <PressableScale onPress={() => openList({ model: m.slug, title: m.name })} feedback="tap" scaleTo={0.96} style={[styles.model, mine ? [styles.modelMine, shadow.buttonSm] : shadow.xs]} accessibilityLabel={m.name}>
                  <PartIcon name={bodyIcon(m)} size={26} color={mine ? colors.white : colors.primary} />
                  <View style={styles.flex}>
                    <Txt variant="bodyStrong" color={mine ? colors.white : colors.ink} numberOfLines={1}>{m.name}</Txt>
                    <Txt variant="tiny" color={mine ? colors.sky : colors.muted}>{m.years ? `${m.years} · ` : ''}{t('catalog.count', { n: count })}</Txt>
                  </View>
                </PressableScale>
              </View>
            );
          })}
        </View>
        <PressableScale onPress={() => router.push('/garage')} scaleTo={0.95} hitSlop={6} style={styles.garageLink} accessibilityLabel={t('garage.title')}>
          <Icon name="car-sport" size={18} color={colors.primary} />
          <Txt variant="smallStrong" color={colors.primary}>{t('garage.title')}</Txt>
        </PressableScale>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  header: { backgroundColor: colors.white, paddingHorizontal: 16, paddingBottom: 14, gap: 12, borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg, ...shadow.soft },
  body: { paddingVertical: 16, gap: 14, paddingBottom: 32 },
  allRow: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: radius.lg, backgroundColor: colors.white },
  allIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 11 },
  tileWrap: { width: '50%', padding: 5 },
  tile: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, gap: 6, minHeight: 132 },
  tileIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  tileLabel: { lineHeight: 20 },
  sectionTitle: { paddingHorizontal: 16, marginTop: 8 },
  models: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 11 },
  modelWrap: { width: '50%', padding: 5 },
  model: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, minHeight: 56, borderRadius: radius.md, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line },
  modelMine: { backgroundColor: colors.primary, borderColor: colors.primary },
  garageLink: { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', gap: 6, padding: 10, minHeight: 44 },
});
