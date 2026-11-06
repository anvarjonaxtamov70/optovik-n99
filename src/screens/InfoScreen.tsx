import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '../components/ui/Controls';
import { Header } from '../components/ui/Header';
import { Txt } from '../components/ui/Txt';
import { infoPage, type InfoPage } from '../content/info';
import { useT, type TKey } from '../i18n';
import { useSettings } from '../state/catalog';
import { colors } from '../theme/tokens';

const PAGES: InfoPage[] = ['about', 'faq', 'privacy', 'delivery'];

export default function InfoScreen() {
  const params = useLocalSearchParams<{ page: string }>();
  const page: InfoPage = PAGES.includes(params.page as InfoPage) ? (params.page as InfoPage) : 'about';
  const insets = useSafeAreaInsets();
  const { t, lang } = useT();
  const settings = useSettings();
  const sections = infoPage(page, lang, settings);
  return (
    <>
      <Header title={t(`info.${page}.title` as TKey)} />
      <ScrollView style={styles.root} contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        {sections.map((s, i) => (
          <Animated.View key={s.title} entering={FadeInDown.delay(i * 60).duration(320)}>
            <Card style={styles.card}>
              <Txt variant="h3">{s.title}</Txt>
              <Txt variant="body">{s.text}</Txt>
            </Card>
          </Animated.View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  card: { gap: 8 },
});
