import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { useShop } from '../../store/ShopProvider';
import { cartSummary } from '../../store/shop';
import { colors } from '../../theme';

export default function TabLayout() {
  const { state } = useShop();
  const count = cartSummary(state).count;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.accent, tabBarInactiveTintColor: colors.muted,
    tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border }, tabBarLabelStyle: { fontSize: 12, fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={{ title: 'Do‘kon', tabBarIcon: ({ color }) => <Text style={{ fontSize: 25, color }}>▦</Text> }} />
    <Tabs.Screen name="saved" options={{ title: 'Sevimlilar', tabBarIcon: ({ color }) => <Text style={{ fontSize: 25, color }}>♡</Text> }} />
    <Tabs.Screen name="savat" options={{ title: 'Savat', tabBarBadge: count || undefined, tabBarIcon: ({ color }) => <Text style={{ fontSize: 25, color }}>▱</Text> }} />
    <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 25, color }}>◉</Text> }} />
  </Tabs>;
}
