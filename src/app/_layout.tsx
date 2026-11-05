import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Unbounded_700Bold, Unbounded_800ExtraBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { IntroSplash } from '../components/brand/IntroSplash';
import { ToastHost } from '../components/ui/ToastHost';
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
  const [intro, setIntro] = useState(true);

  useEffect(() => {
    void Promise.allSettled([hydratePrefs(), hydrateCart()]).then(() => setBooted(true));
    void startCatalog();
    void startAccount();
  }, []);

  const ready = (fontsLoaded || !!fontError) && booted;
  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);
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
      {intro ? <IntroSplash onDone={endIntro} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.bg } });
