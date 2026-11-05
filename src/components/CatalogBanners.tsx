import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { colors, shadows, ui } from '../theme';
import { Icon } from './Icon';

export function CatalogBanners({ onGM, onAccessories }: { onGM: () => void; onAccessories: () => void }) {
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > 1.25;
  return <View style={styles.banners}>
    {([
      { title: 'GM uchun\nehtiyot qismlar', subtitle: 'Cobalt · Gentra · Nexia', button: 'Qismlarni ko‘rish', image: require('../../assets/home/gm-parts.webp'), onPress: onGM, secondary: false },
      { title: 'Avtomobilingizga\nqulaylik', subtitle: 'Foydali aksessuarlar', button: 'Aksessuarlarni ko‘rish', image: require('../../assets/home/accessories.webp'), onPress: onAccessories, secondary: true },
    ] as const).map((banner) => <Pressable key={banner.button} accessibilityRole="button" accessibilityLabel={banner.button} onPress={banner.onPress} style={({ pressed }) => [styles.shadow, shadows.card, pressed && ui.pressed]}>
      <LinearGradient colors={banner.secondary ? ['#f0f9ff', '#ddecf9'] : ['#e4f5ff', '#bfe7ff']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, banner.secondary && styles.secondary, stacked && styles.stacked]}>
        <View style={[styles.copy, stacked && styles.wide]}>
          <Text accessibilityRole="header" style={styles.title}>{banner.title}</Text>
          <Text style={styles.subtitle}>{banner.subtitle}</Text>
          <View style={[styles.cta, shadows.button]}><Text style={styles.ctaText}>{banner.button}</Text><Icon name="arrow" size={15} /></View>
        </View>
        <Image source={banner.image} resizeMode="contain" accessible={false} style={[styles.art, banner.secondary && styles.accessoryArt, stacked && styles.stackedArt]} />
      </LinearGradient>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  banners: { gap: 12, paddingTop: 3 }, shadow: { borderRadius: 22, backgroundColor: colors.blueLight },
  banner: { borderRadius: 22, padding: 17, minHeight: 174, justifyContent: 'center', overflow: 'hidden' },
  secondary: { minHeight: 148 },
  copy: { width: '54%', zIndex: 1, gap: 7 }, wide: { width: '100%' },
  title: { color: colors.text, fontSize: 21, lineHeight: 25, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: colors.text, fontSize: 11, lineHeight: 17 },
  cta: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 12, padding: 9, minHeight: 40, backgroundColor: colors.blue },
  ctaText: { fontSize: 11, lineHeight: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  art: { position: 'absolute', right: -3, bottom: 7, width: '49%', height: '86%' },
  accessoryArt: { right: 0, width: '46%', height: '86%' },
  stacked: { paddingBottom: 0 }, stackedArt: { position: 'relative', width: '100%', height: 150, right: 0, bottom: 0 },
});
