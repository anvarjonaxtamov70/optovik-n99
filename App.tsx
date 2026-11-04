import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, type ColorValue } from 'react-native';

import { ShopProvider, useShop } from './src/store/ShopProvider';
import { cartSummary } from './src/store/shop';
import { colors } from './src/theme';

function MenuIcon({ kind, color }: { kind: 'catalog' | 'cart'; color: ColorValue }) {
  return kind === 'catalog' ? (
    <View style={styles.gridIcon} accessible={false}>
      {[0, 1, 2, 3].map((key) => (
        <View key={key} style={[styles.gridSquare, { borderColor: color }]} />
      ))}
    </View>
  ) : (
    <View style={styles.cartIcon} accessible={false}>
      <View style={[styles.cartHandle, { backgroundColor: color }]} />
      <View style={[styles.cartBasket, { borderColor: color }]} />
      <View style={[styles.cartWheel, styles.leftWheel, { backgroundColor: color }]} />
      <View style={[styles.cartWheel, styles.rightWheel, { backgroundColor: color }]} />
    </View>
  );
}

function ShopTabs() {
  const { state } = useShop();
  const { count } = cartSummary(state);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.muted,
        tabBarActiveBackgroundColor: colors.blueLight,
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
        tabBarBadgeStyle: styles.badge,
      }}
    >
      <Tabs.Screen name="index" options={{
        title: 'Katalog',
        tabBarIcon: ({ color }) => <MenuIcon kind="catalog" color={color} />,
      }} />
      <Tabs.Screen name="savat" options={{
        title: 'Savat',
        tabBarBadge: count || undefined,
        tabBarAccessibilityLabel: `Savat, ${count} dona mahsulot`,
        tabBarIcon: ({ color }) => <MenuIcon kind="cart" color={color} />,
      }} />
    </Tabs>
  );
}

export default function App() {
  return (
    <ShopProvider>
      <StatusBar style="dark" />
      <ShopTabs />
    </ShopProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: { backgroundColor: colors.white, borderTopColor: colors.border },
  tabItem: { borderRadius: 16, marginHorizontal: 12, marginTop: 5, marginBottom: 3 },
  tabLabel: { fontSize: 13, fontWeight: '700' },
  badge: { backgroundColor: colors.blue, color: colors.text, fontWeight: '700' },
  gridIcon: { width: 22, height: 22, flexDirection: 'row', flexWrap: 'wrap', gap: 3 },
  gridSquare: { width: 9, height: 9, borderWidth: 2, borderRadius: 3 },
  cartIcon: { width: 25, height: 24 },
  cartHandle: { position: 'absolute', top: 2, left: 0, width: 6, height: 2, borderRadius: 1 },
  cartBasket: { position: 'absolute', top: 4, left: 5, width: 19, height: 13, borderWidth: 2, borderRadius: 3 },
  cartWheel: { position: 'absolute', bottom: 1, width: 4, height: 4, borderRadius: 2 },
  leftWheel: { left: 7 },
  rightWheel: { right: 2 },
});
