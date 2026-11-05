import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon, type IconName } from '../../components/Icon';
import { useShop } from '../../store/ShopProvider';
import { cartSummary } from '../../store/shop';
import { colors } from '../../theme';

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return <View style={[styles.icon, focused && styles.active]}><Icon name={name} size={23} /></View>;
}
function TabBackground() {
  return Platform.OS === 'ios' ? <BlurView tint="light" intensity={70} style={StyleSheet.absoluteFill} /> : <View style={[StyleSheet.absoluteFill, styles.background]} />;
}
export default function TabLayout() {
  const { state } = useShop();
  const insets = useSafeAreaInsets();
  const count = cartSummary(state).count;
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.text, tabBarInactiveTintColor: colors.text,
    tabBarBackground: () => <TabBackground />,
    tabBarStyle: { height: 64 + insets.bottom, paddingTop: 5, backgroundColor: 'transparent', borderTopWidth: 0.5, borderTopColor: colors.border, shadowColor: '#285476', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.07, shadowRadius: 12, elevation: 8 },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 4 }, tabBarBadgeStyle: { backgroundColor: colors.blue, color: colors.text, fontSize: 10 } }}>
    <Tabs.Screen name="index" options={{ title: 'Do‘kon', tabBarIcon: ({ focused }) => <TabIcon name="store" focused={focused} /> }} />
    <Tabs.Screen name="saved" options={{ title: 'Sevimlilar', tabBarIcon: ({ focused }) => <TabIcon name="heart" focused={focused} /> }} />
    <Tabs.Screen name="savat" options={{ title: 'Savat', tabBarBadge: count > 99 ? '99+' : count || undefined, tabBarIcon: ({ focused }) => <TabIcon name="cart" focused={focused} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ focused }) => <TabIcon name="user" focused={focused} /> }} />
  </Tabs>;
}
const styles = StyleSheet.create({
  icon: { width: 50, height: 32, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: colors.blueLight }, background: { backgroundColor: '#fffffff2' },
});
