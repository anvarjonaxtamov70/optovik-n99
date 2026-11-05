import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { AccountProvider } from './src/store/AccountProvider';
import { ShopProvider } from './src/store/ShopProvider';
import { colors } from './src/theme';

export default function App() {
  return <AccountProvider><ShopProvider><StatusBar style="dark" />
    <Stack screenOptions={{ headerTintColor: colors.text, headerStyle: { backgroundColor: colors.background }, headerShadowVisible: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="product/[category]/[id]" options={{ title: 'Mahsulot' }} />
      <Stack.Screen name="checkout" options={{ title: 'Buyurtma berish' }} />
      <Stack.Screen name="orders" options={{ title: 'Buyurtmalarim' }} />
      <Stack.Screen name="order/[uid]/[id]" options={{ title: 'Buyurtma' }} />
      <Stack.Screen name="admin" options={{ title: 'Do‘kon boshqaruvi' }} />
      <Stack.Screen name="compare" options={{ title: 'Taqqoslash' }} />
    </Stack>
  </ShopProvider></AccountProvider>;
}
