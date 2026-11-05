import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useShop } from '../store/ShopProvider';
import { colors, shadows, ui } from '../theme';
import { Icon } from './Icon';

export function CompareTray() {
  const { state, compareIds, toggleCompare } = useShop();
  const count = state.products.filter((p) => compareIds.includes(p.id)).length;
  if (!compareIds.length) return null;
  return <View style={[styles.tray, shadows.small]}>
    <Pressable accessibilityLabel="Taqqoslashni tozalash" accessibilityRole="button" onPress={() => compareIds.forEach(toggleCompare)} style={styles.clear}><Icon name="close" size={18} /></Pressable>
    <Text style={styles.text}>{count}/2 ta tanlandi</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Tanlangan mahsulotlarni taqqoslash" disabled={count !== 2} accessibilityState={{ disabled: count !== 2 }} onPress={() => router.push('/compare')} style={({ pressed }) => [styles.button, count !== 2 && ui.disabled, pressed && ui.pressed]}>
      <Icon name="scale" size={18} /><Text style={styles.buttonText}>Taqqoslash</Text>
    </Pressable>
  </View>;
}
const styles = StyleSheet.create({
  tray: { backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.border },
  clear: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, color: colors.text, fontSize: 12 },
  button: { minHeight: 48, padding: 10, borderRadius: 12, backgroundColor: colors.blue, flexDirection: 'row', alignItems: 'center', gap: 6 },
  buttonText: { color: colors.text, fontSize: 13, fontWeight: '700' },
});
