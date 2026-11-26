import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Unbounded_700Bold, Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { router, Stack, usePathname, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { IntroSplash } from '../components/brand/IntroSplash';
import { KeyboardDismiss } from '../components/ui/KeyboardDismiss';
import { PortalHost } from '../components/ui/Portal';
import { ToastHost } from '../components/ui/ToastHost';
import { isWebAllowedPath } from '../domain/webAccess';
import { IS_WEB, WEB_ADMIN_ONLY } from '../lib/platform';
import { startAccount } from '../state/account';
import { hydrateCart } from '../state/cart';
import { startCatalog } from '../state/catalog';
import { startKeyboard } from '../state/keyboard';
import { hydratePrefs } from '../state/prefs';
import { colors } from '../theme/tokens';

void SplashScreen.preventAutoHideAsync().catch(() => {});

// Do not expose raw exceptions, customer data or credentials in the recovery UI.
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.recovery}>
      <Text accessibilityRole="header" style={styles.recoveryTitle}>Xatolik yuz berdi / Произошла ошибка</Text>
      <Text style={styles.recoveryText}>Qayta urinib ko‘ring / Попробуйте снова</Text>
      <Pressable accessibilityRole="button" onPress={() => { void retry(); }} style={styles.recoveryButton}>
        <Text style={styles.recoveryButtonText}>Qayta urinish / Повторить</Text>
      </Pressable>
    </View>
  );
}

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
    startKeyboard();
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
        {/* Xarita surilganda ekran chetidan "orqaga" imosi bilan adashmasin. */}
        <Stack.Screen name="address" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="order-success" options={{ animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="admin" options={{ animation: 'slide_from_bottom' }} />
      </Stack>
      {/* Pastdan chiqadigan oynalar, xabarlar va klaviatura ustidagi «Yopish» tugmasi — hammasidan ustda. */}
      <PortalHost />
      <ToastHost />
      <KeyboardDismiss />
      {blocked ? <View style={styles.cover} /> : null}
      {intro ? <IntroSplash onDone={endIntro} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  recovery: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: colors.bg, gap: 16 },
  recoveryTitle: { fontSize: 20, fontWeight: '700', color: colors.ink, textAlign: 'center' },
  recoveryText: { fontSize: 15, color: colors.ink, textAlign: 'center' },
  recoveryButton: { backgroundColor: colors.primary, borderRadius: 14, padding: 16 },
  recoveryButtonText: { color: '#FFFFFF', fontWeight: '700' },
  // Yo'naltirish tugaguncha do'kon sahifasi bir lahza ham ko'rinmasin.
  cover: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.bg },
});
