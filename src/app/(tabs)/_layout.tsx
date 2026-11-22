import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '../../components/TabBar';
import { colors } from '../../theme/tokens';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      // Bo'limlar orasida o'tish darhol: avvalgi "fade" ikkala ekranni yarim shaffof qilib, bir lahza likillatardi.
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg }, animation: 'none', tabBarHideOnKeyboard: true }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="catalog" />
      <Tabs.Screen name="cart" />
      <Tabs.Screen name="favorites" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
