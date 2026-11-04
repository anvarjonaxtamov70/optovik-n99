import { Tabs } from 'expo-router';
import { Text, View, type ColorValue } from 'react-native';

import { useShop } from '../../store/ShopProvider';
import { cartSummary } from '../../store/shop';
import { colors } from '../../theme';

export default function TabLayout() {
  const { state } = useShop();
  const count = cartSummary(state).count;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border }, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={{ title: 'Do‘kon', tabBarIcon: ({ color }) => <TabIcon name="shop" color={color} /> }} />
    <Tabs.Screen name="saved" options={{ title: 'Sevimlilar', tabBarIcon: ({ color }) => <Text style={{ fontSize: 25, color }}>♡</Text> }} />
    <Tabs.Screen name="savat" options={{ title: 'Savat', tabBarBadge: count || undefined, tabBarIcon: ({ color }) => <TabIcon name="cart" color={color} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ color }) => <TabIcon name="profile" color={color} /> }} />
  </Tabs>;
}

function TabIcon({ name, color }: { name: 'shop' | 'cart' | 'profile'; color: ColorValue }) {
  if (name === 'shop') return <View style={{ width: 23, height: 23, flexDirection: 'row', flexWrap: 'wrap', gap: 3 }}>{[0, 1, 2, 3].map((i) => <View key={i} style={{ width: 10, height: 10, borderRadius: 3, borderWidth: 2, borderColor: color }} />)}</View>;
  if (name === 'profile') return <View style={{ width: 25, height: 25, alignItems: 'center', gap: 3 }}><View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: color }} /><View style={{ width: 23, height: 10, borderTopLeftRadius: 12, borderTopRightRadius: 12, borderWidth: 2, borderColor: color }} /></View>;
  return <View style={{ width: 26, height: 25 }}><View style={{ position: 'absolute', top: 2, width: 6, height: 2, backgroundColor: color }} /><View style={{ position: 'absolute', top: 4, left: 4, width: 21, height: 13, borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 4, borderBottomRightRadius: 4, borderColor: color }} />{[7, 20].map((left) => <View key={left} style={{ position: 'absolute', top: 21, left, width: 4, height: 4, borderRadius: 2, backgroundColor: color }} />)}</View>;
}
