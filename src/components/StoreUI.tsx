import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors } from '../theme';

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={{ gap: 7 }}><Text style={styles.label}>{label}</Text><TextInput {...props} accessibilityLabel={label}
    placeholderTextColor={colors.muted} style={[styles.input, props.multiline && { minHeight: 96, textAlignVertical: 'top' }, props.style]} /></View>;
}
export function Message({ text }: { text: string }) {
  return text ? <Text accessibilityLiveRegion="polite" style={styles.message}>{text}</Text> : null;
}
export function Pill({ text, selected, onPress }: { text: string; selected: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected }} style={[styles.pill, selected && styles.selected]}>
    <Text style={{ color: colors.text, fontWeight: '600' }}>{text}</Text>
  </Pressable>;
}
export { ProductPhoto } from './ProductPhoto';
export { ProductCard } from './ProductCard';
const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  input: { backgroundColor: colors.white, borderColor: colors.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, minHeight: 50, color: colors.text, fontSize: 16 },
  message: { backgroundColor: colors.warning, padding: 14, borderRadius: 14, color: colors.text, fontSize: 14, lineHeight: 21 },
  pill: { paddingHorizontal: 15, paddingVertical: 12, minHeight: 44, borderRadius: 24, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  selected: { backgroundColor: colors.blue, borderColor: colors.blue },
});
