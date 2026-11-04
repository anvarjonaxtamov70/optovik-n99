import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useShop } from '../store/ShopProvider';
import { colors, ui } from '../theme';

export function ScreenHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.brand}>
        <Text style={styles.brandName}>OPTOVIK</Text>
        <View style={styles.logo}><Text style={styles.logoText}>N99</Text></View>
      </View>
      <Text style={styles.title} accessibilityRole="header">{title}</Text>
      <Text style={ui.secondary}>{subtitle}</Text>
    </View>
  );
}

export function ActionButton({ label, onPress, disabled = false, accessibilityLabel }: {
  label: string; onPress: () => void; disabled?: boolean; accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [ui.button, disabled && ui.disabled, pressed && ui.pressed]}
    ><Text style={ui.buttonText}>{label}</Text></Pressable>
  );
}

export function ConnectionStatus() {
  const { state, retry } = useShop();
  if (state.status === 'ready') return null;
  return (
    <View style={styles.status} accessibilityLiveRegion="polite">
      {state.status === 'loading' && <ActivityIndicator color={colors.text} />}
      <Text style={styles.statusText}>{state.message}</Text>
      {(state.status === 'error' || state.status === 'slow') && <ActionButton label="Qayta urinish" onPress={retry} />}
    </View>
  );
}

export function EmptyState({ title, message, action }: {
  title: string; message: string; action?: { label: string; onPress: () => void };
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}><Text style={styles.emptyMarkText}>N99</Text></View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {action && <ActionButton label={action.label} onPress={action.onPress} />}
    </View>
  );
}

export function CartNotice() {
  const { state, dispatch } = useShop();
  if (!state.cartNotice) return null;
  return (
    <View style={styles.notice} accessibilityLiveRegion="polite">
      <Text style={styles.statusText}>{state.cartNotice}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Qoldiq haqidagi xabarni yopish"
        onPress={() => dispatch({ type: 'dismissNotice' })}
        style={({ pressed }) => [styles.dismiss, pressed && ui.pressed]}
      ><Text style={ui.buttonText}>×</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20, gap: 6 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 12 },
  brandName: { color: colors.text, fontSize: 17, letterSpacing: 1.5, fontWeight: '800' },
  logo: { backgroundColor: colors.blue, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  logoText: { fontWeight: '900', fontSize: 14, color: colors.text },
  title: { fontSize: 32, lineHeight: 40, fontWeight: '800', color: colors.text },
  status: { marginHorizontal: 20, marginBottom: 14, backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, padding: 16, borderRadius: 16, gap: 12 },
  statusText: { fontSize: 14, lineHeight: 21, color: colors.text, flexShrink: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', gap: 14, paddingVertical: 36, paddingHorizontal: 12 },
  emptyMark: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueLight },
  emptyMarkText: { fontSize: 21, fontWeight: '900', color: colors.text },
  emptyTitle: { fontSize: 21, fontWeight: '700', color: colors.text, textAlign: 'center' },
  emptyMessage: { fontSize: 16, lineHeight: 24, color: colors.muted, textAlign: 'center' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 14, paddingLeft: 16, borderRadius: 16, backgroundColor: colors.warning },
  dismiss: { minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
