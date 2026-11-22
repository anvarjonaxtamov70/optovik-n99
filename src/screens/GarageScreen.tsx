import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { bodyIcon } from '../components/shop/CatalogBits';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Controls';
import { goBack, Header } from '../components/ui/Header';
import { Icon, PartIcon } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { Txt } from '../components/ui/Txt';
import { CAR_MODELS } from '../domain/taxonomy';
import { useT } from '../i18n';
import { haptic } from '../lib/haptics';
import { prefs, useMyCar } from '../state/prefs';
import { showToast } from '../state/toast';
import { colors, radius, shadow } from '../theme/tokens';

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 25 }, (_, i) => THIS_YEAR - i);

export default function GarageScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const car = useMyCar();
  const [model, setModel] = useState(car?.model ?? null);
  const [year, setYear] = useState<number | undefined>(car?.year);
  // Belgi va yillar faqat tanlanganda yumshoq paydo bo'ladi (ekran ochilganda hammasi tinch).
  const [picked, setPicked] = useState(false);
  const save = () => {
    if (!model) return;
    prefs.setCar({ model, year });
    haptic.success();
    showToast(t('garage.saved', { car: CAR_MODELS.find((m) => m.slug === model)?.name ?? '' }), { kind: 'success', icon: 'car-sport' });
    goBack();
  };
  return (
    <View style={styles.root}>
      <Header title={t('garage.title')} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]}>
        <Txt variant="body" color={colors.muted}>{t('garage.subtitle')}</Txt>
        <View style={styles.grid}>
          {CAR_MODELS.map((m) => {
            const on = model === m.slug;
            return (
              <View key={m.slug} style={styles.cell}>
                <PressableScale onPress={() => { haptic.tap(); setPicked(true); setModel(m.slug); }} scaleTo={0.95}
                  style={[styles.card, on ? [styles.cardOn, shadow.button] : shadow.soft]} accessibilityLabel={m.name} accessibilityState={{ selected: on }}>
                  {on ? <Animated.View entering={picked ? ZoomIn.duration(160) : undefined} style={styles.check}><Icon name="checkmark" size={14} color={colors.primary} /></Animated.View> : null}
                  <PartIcon name={bodyIcon(m)} size={38} color={on ? colors.white : colors.primary} />
                  <Txt variant="bodyStrong" color={on ? colors.white : colors.ink} numberOfLines={1}>{m.name}</Txt>
                  {m.years ? <Txt variant="tiny" color={on ? colors.sky : colors.muted}>{m.years}</Txt> : null}
                </PressableScale>
              </View>
            );
          })}
        </View>
        {model ? (
          <Animated.View entering={picked ? FadeIn.duration(200) : undefined} style={styles.years}>
            <Txt variant="label">{t('garage.year')} ({t('common.optional')})</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.yearRow}>
              {YEARS.map((y) => <Chip key={y} label={String(y)} selected={year === y} onPress={() => setYear(year === y ? undefined : y)} />)}
            </ScrollView>
          </Animated.View>
        ) : null}
        {car ? <Button title={t('garage.remove')} variant="ghost" onPress={() => { prefs.setCar(null); setModel(null); setYear(undefined); haptic.tap(); }} /> : null}
      </ScrollView>
      <View style={[styles.bar, shadow.float, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title={t('common.save')} size="lg" disabled={!model} onPress={save} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 16, width: '100%', maxWidth: 760, alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
  cell: { width: '33.33%', padding: 5 },
  card: { alignItems: 'center', gap: 4, paddingVertical: 16, borderRadius: radius.lg, backgroundColor: colors.white },
  cardOn: { backgroundColor: colors.primary },
  check: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  years: { gap: 10 },
  yearRow: { gap: 8, paddingVertical: 4 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 12, backgroundColor: colors.white },
});
