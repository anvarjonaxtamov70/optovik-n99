import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Logo } from '../components/brand/Logo';
import { bodyIcon } from '../components/shop/CatalogBits';
import { Card, ListRow, Radio } from '../components/ui/Controls';
import { Icon, PartIcon, type IconName } from '../components/ui/Icon';
import { PressableScale } from '../components/ui/PressableScale';
import { Sheet } from '../components/ui/Sheet';
import { Txt } from '../components/ui/Txt';
import { isActive } from '../domain/order';
import { displayPhone } from '../domain/phone';
import { modelBySlug } from '../domain/taxonomy';
import { useT } from '../i18n';
import { haptic } from '../lib/haptics';
import { useAccount } from '../state/account';
import { useCartCount } from '../state/cart';
import { useMyOrders } from '../state/orders';
import { useFavorites, useMyCar } from '../state/prefs';
import { colors, gradients, radius, shadow } from '../theme/tokens';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { t, lang, setLang } = useT();
  const account = useAccount();
  const favs = useFavorites();
  const cartCount = useCartCount();
  const { orders } = useMyOrders();
  const car = useMyCar();
  const carModel = modelBySlug(car?.model);
  const [langOpen, setLangOpen] = useState(false);
  const p = account.profile;
  const initials = p.name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const active = orders.filter((o) => isActive(o.holat)).length;
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: insets.top + 18 }]}>
          <View style={styles.heroGlow} />
          <View style={styles.heroRow}>
            <View style={styles.avatar}>
              {initials ? <Txt style={styles.initials}>{initials}</Txt> : <Icon name="person" size={30} color={colors.primary} />}
            </View>
            <View style={styles.flex}>
              <Txt variant="h2" color={colors.white} numberOfLines={1}>{p.name || t('profile.guest')}</Txt>
              <Txt variant="small" color="rgba(255,255,255,0.82)">{p.phone ? displayPhone(p.phone) : t('profile.fillProfile')}</Txt>
            </View>
            <PressableScale onPress={() => router.push('/profile-edit')} style={styles.edit} accessibilityLabel={t('profile.personal')}>
              <Icon name="create-outline" size={20} color={colors.white} />
            </PressableScale>
          </View>
          <View style={styles.stats}>
            <Stat icon="receipt-outline" value={orders.length} label={t('profile.orders')} badge={active} onPress={() => router.push('/orders')} />
            <Stat icon="heart-outline" value={favs.length} label={t('profile.favorites')} onPress={() => router.navigate('/favorites')} />
            <Stat icon="cart-outline" value={cartCount} label={t('profile.cart')} onPress={() => router.navigate('/cart')} />
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <Animated.View entering={FadeInDown.duration(320)}>
            <PressableScale onPress={() => router.push('/garage')} scaleTo={0.98} style={[styles.car, shadow.soft]} accessibilityLabel={t('profile.myCar')}>
              <View style={styles.carIcon}><PartIcon name={carModel ? bodyIcon(carModel) : 'car-cog'} size={30} color={colors.primary} /></View>
              <View style={styles.flex}>
                <Txt variant="label">{t('profile.myCar')}</Txt>
                <Txt variant="h3">{carModel ? `Chevrolet ${carModel.name}${car?.year ? `, ${car.year}` : ''}` : t('profile.noCar')}</Txt>
              </View>
              <Icon name="chevron-forward" size={18} color={colors.faint} />
            </PressableScale>
          </Animated.View>

          <Group title={t('profile.sectionShop')} delay={60}>
            <ListRow icon="receipt-outline" title={t('profile.orders')} value={active ? String(active) : undefined} onPress={() => router.push('/orders')} />
            <ListRow icon="heart-outline" title={t('profile.favorites')} onPress={() => router.navigate('/favorites')} last />
          </Group>

          <Group title={t('profile.sectionSettings')} delay={120}>
            <ListRow icon="person-outline" title={t('profile.personal')} onPress={() => router.push('/profile-edit')} />
            <ListRow icon="language-outline" title={t('profile.language')} value={lang === 'ru' ? t('lang.ru') : t('lang.uz')} onPress={() => setLangOpen(true)} last />
          </Group>

          <Group title={t('profile.sectionInfo')} delay={180}>
            <ListRow icon="call-outline" title={t('profile.contact')} onPress={() => router.push('/contact')} />
            <ListRow icon="bicycle-outline" title={t('profile.delivery')} onPress={() => router.push({ pathname: '/info/[page]', params: { page: 'delivery' } })} />
            <ListRow icon="help-circle-outline" title={t('profile.faq')} onPress={() => router.push({ pathname: '/info/[page]', params: { page: 'faq' } })} />
            <ListRow icon="information-circle-outline" title={t('profile.about')} onPress={() => router.push({ pathname: '/info/[page]', params: { page: 'about' } })} />
            <ListRow icon="shield-checkmark-outline" title={t('profile.privacy')} onPress={() => router.push({ pathname: '/info/[page]', params: { page: 'privacy' } })} last />
          </Group>

          {account.admin ? (
            <Group title={t('profile.owner')} delay={220}>
              <ListRow icon="speedometer-outline" title={t('profile.admin')} onPress={() => router.push('/admin')} last />
            </Group>
          ) : null}

          <View style={styles.footer}>
            <PressableScale onLongPress={() => { haptic.medium(); router.push('/admin'); }} delayLongPress={900} accessibilityLabel={t('profile.owner')}>
              <Logo height={22} />
            </PressableScale>
            <Txt variant="tiny" center>{t('app.tagline')}</Txt>
            <Txt variant="tiny" center color={colors.faint}>{t('profile.version', { v: version })}</Txt>
            {!account.admin && account.anonymous ? (
              <PressableScale onPress={() => router.push('/admin')} hitSlop={8} accessibilityLabel={t('profile.owner')}>
                <Txt variant="tiny" color={colors.faint} style={styles.ownerLink}>{t('profile.owner')}</Txt>
              </PressableScale>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <Sheet visible={langOpen} onClose={() => setLangOpen(false)} title={t('lang.title')} closeLabel={t('common.close')}>
        {(['uz', 'ru'] as const).map((l) => (
          <PressableScale key={l} onPress={() => { setLang(l); haptic.tap(); setLangOpen(false); }} style={styles.langRow} accessibilityLabel={l === 'ru' ? 'Русский' : 'O‘zbekcha'}>
            <Txt style={styles.flag}>{l === 'ru' ? 'RU' : 'UZ'}</Txt>
            <Txt variant="bodyStrong" style={styles.flex}>{l === 'ru' ? 'Русский' : 'O‘zbekcha'}</Txt>
            <Radio checked={lang === l} />
          </PressableScale>
        ))}
      </Sheet>
    </View>
  );
}

function Stat({ icon, value, label, onPress, badge }: { icon: IconName; value: number; label: string; onPress: () => void; badge?: number }) {
  return (
    <PressableScale onPress={onPress} style={styles.stat} accessibilityLabel={`${label}: ${value}`}>
      <View>
        <Icon name={icon} size={20} color={colors.white} />
        {badge ? <View style={styles.statBadge} /> : null}
      </View>
      <Txt variant="h3" color={colors.white}>{value}</Txt>
      <Txt variant="tiny" color="rgba(255,255,255,0.8)" numberOfLines={1}>{label}</Txt>
    </PressableScale>
  );
}

function Group({ title, children, delay }: { title: string; children: React.ReactNode; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(320)} style={styles.group}>
      <Txt variant="label" style={styles.groupTitle}>{title.toUpperCase()}</Txt>
      <Card padded={false} style={styles.groupCard}>{children}</Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  hero: { paddingHorizontal: 18, paddingBottom: 18, borderBottomLeftRadius: 28, borderBottomRightRadius: 28, overflow: 'hidden', gap: 18 },
  heroGlow: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(255,255,255,0.08)', top: -110, right: -70 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 62, height: 62, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  initials: { fontFamily: 'Unbounded_700Bold', fontSize: 22, color: colors.primary },
  edit: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: radius.md, backgroundColor: 'rgba(255,255,255,0.13)', padding: 12, gap: 2 },
  statBadge: { position: 'absolute', top: -2, left: 16, width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFC94D' },
  body: { padding: 16, gap: 18, width: '100%', maxWidth: 760, alignSelf: 'center' },
  car: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.lg, backgroundColor: colors.white },
  carIcon: { width: 54, height: 54, borderRadius: 16, backgroundColor: colors.tint, alignItems: 'center', justifyContent: 'center' },
  group: { gap: 8 },
  groupTitle: { marginLeft: 4 },
  groupCard: { paddingHorizontal: 14 },
  footer: { alignItems: 'center', gap: 6, paddingTop: 8 },
  ownerLink: { textDecorationLine: 'underline', marginTop: 6 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  flag: { fontFamily: 'Unbounded_700Bold', fontSize: 13, color: colors.primary, width: 32 },
});
