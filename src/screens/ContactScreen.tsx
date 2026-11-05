import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LogoMark } from '../components/brand/Logo';
import { Button } from '../components/ui/Button';
import { Card, ListRow } from '../components/ui/Controls';
import { Header } from '../components/ui/Header';
import { Txt } from '../components/ui/Txt';
import { displayPhone } from '../domain/phone';
import { useT } from '../i18n';
import { callPhone, openInstagram, openMap, openTelegram } from '../lib/links';
import { useSettings } from '../state/catalog';
import { colors, gradients, radius } from '../theme/tokens';

export default function ContactScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  const s = useSettings();
  return (
    <View style={styles.root}>
      <Header title={t('contact.title')} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Animated.View entering={FadeInDown.duration(320)}>
          <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
            <LogoMark size={64} />
            <View style={styles.flex}>
              <Txt variant="h2" color={colors.white}>{s.name}</Txt>
              <Txt variant="small" color="rgba(255,255,255,0.85)">{t('app.tagline')}</Txt>
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(320)}>
          <Card padded={false} style={styles.card}>
            <ListRow icon="location-outline" title={t('contact.address')} subtitle={`${s.address}${s.landmark ? ` · ${s.landmark}` : ''}`} />
            {s.workHours ? <ListRow icon="time-outline" title={t('contact.hours')} subtitle={s.workHours} /> : null}
            {s.phone ? <ListRow icon="call-outline" title={t('contact.phone')} subtitle={displayPhone(s.phone)} onPress={() => callPhone(s.phone)} /> : <ListRow icon="call-outline" title={t('contact.phone')} subtitle={t('contact.noPhone')} />}
            {s.phone2 ? <ListRow icon="call-outline" title={t('contact.phone')} subtitle={displayPhone(s.phone2)} onPress={() => callPhone(s.phone2)} /> : null}
            {s.telegram ? <ListRow icon="paper-plane-outline" title={t('contact.telegram')} subtitle={`@${s.telegram.replace(/^@/, '')}`} onPress={() => openTelegram(s.telegram)} /> : null}
            {s.instagram ? <ListRow icon="logo-instagram" title={t('contact.instagram')} subtitle={`@${s.instagram.replace(/^@/, '')}`} onPress={() => openInstagram(s.instagram)} last /> : null}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(320)} style={styles.gap}>
          <Txt variant="h3">{t('contact.route')}</Txt>
          <View style={styles.row}>
            <Button title={t('contact.yandex')} icon="navigate-outline" variant="secondary" full={false} style={styles.flex} onPress={() => openMap(s, 'yandex')} />
            <Button title={t('contact.google')} icon="map-outline" variant="secondary" full={false} style={styles.flex} onPress={() => openMap(s, 'google')} />
          </View>
          {s.phone ? <Button title={t('common.call')} icon="call" size="lg" onPress={() => callPhone(s.phone)} /> : null}
        </Animated.View>

        {s.legalName || s.inn ? (
          <Card style={styles.gap}>
            <Txt variant="label">{t('contact.legal')}</Txt>
            {s.legalName ? <Txt variant="bodyStrong">{s.legalName}</Txt> : null}
            {s.inn ? <Txt variant="small">STIR / ИНН: {s.inn}</Txt> : null}
          </Card>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: 16, gap: 14, width: '100%', maxWidth: 760, alignSelf: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderRadius: radius.xl },
  card: { paddingHorizontal: 14 },
  gap: { gap: 10 },
  row: { flexDirection: 'row', gap: 10 },
});
