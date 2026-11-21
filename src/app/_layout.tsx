import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Unbounded_700Bold, Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { router, Stack, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IntroSplash } from '../components/brand/IntroSplash';
import { ToastHost } from '../components/ui/ToastHost';
import { isWebAllowedPath } from '../domain/webAccess';
import { IS_WEB, WEB_ADMIN_ONLY } from '../lib/platform';
import { startAccount } from '../state/account';
import { hydrateCart } from '../state/cart';
import { startCatalog } from '../state/catalog';
import { hydratePrefs } from '../state/prefs';
import { colors } from '../theme/tokens';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    Unbounded_700Bold, Unbounded_800ExtraBold,
  });
  const [booted, setBooted] = useState(false);
  // Brauzerda (admin paneli) intro animatsiyasi har sahifa yangilanganda halal beradi.
  const [intro, setIntro] = useState(!IS_WEB);
  const pathname = usePathname();
  const blocked = WEB_ADMIN_ONLY && !isWebAllowedPath(pathname);

  useEffect(() => {
    void Promise.allSettled([hydratePrefs(), hydrateCart()]).then(() => setBooted(true));
    void startCatalog();
    void startAccount();
  }, []);

  const ready = (fontsLoaded || !!fontError) && booted;
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);
  // Web versiya faqat admin uchun: do'kon sahifalari brauzerda ochilmaydi.
  useEffect(() => {
    if (ready && blocked) router.replace('/admin');
  }, [ready, blocked]);
  const endIntro = useCallback(() => setIntro(false), []);

  if (!ready) return null;
  return (
    <View style={styles.root}>
      <StatusBar style={intro ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="search" options={{ animation: 'fade_from_bottom' }} />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order-success" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="admin" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      <ToastHost />
      {blocked ? <View style={styles.cover} /> : null}
      {intro ? <IntroSplash onDone={endIntro} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  // Yo'naltirish tugaguncha do'kon sahifasi bir lahza ham ko'rinmasin.
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
});
