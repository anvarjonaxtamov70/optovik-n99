import { StyleSheet } from 'react-native';

export const colors = {
  accent: '#247bc1',
  success: '#16784e',
  text: '#111827',
  muted: '#384454',
  white: '#ffffff',
  background: '#f7fafd',
  blue: '#78cefa',
  blueLight: '#e4f4ff',
  border: '#d8e8f4',
  disabled: '#e5ebf0',
  warning: '#fff3dd',
  sale: '#ed3c3c',
  photo: '#f0f3f6',
};

export const shadows = StyleSheet.create({
  card: { shadowColor: '#285476', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 3 },
  button: { shadowColor: '#218bc2', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 7, elevation: 2 },
  small: { shadowColor: '#22364b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 5, elevation: 2 },
});

export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  list: { paddingHorizontal: 20, paddingBottom: 24, gap: 14 },
  emptyList: { flexGrow: 1 },
  card: { backgroundColor: colors.white, padding: 20, borderRadius: 22, borderWidth: 1, borderColor: colors.border, gap: 12 },
  name: { fontSize: 20, lineHeight: 27, fontWeight: '700', color: colors.text },
  price: { fontSize: 25, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'] },
  secondary: { fontSize: 14, lineHeight: 21, color: colors.muted },
  category: { fontSize: 12, lineHeight: 18, color: colors.muted, fontWeight: '600' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  pressed: { opacity: 0.65 },
  button: { minHeight: 48, paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.text, fontWeight: '700', fontSize: 16, textAlign: 'center' },
  disabled: { backgroundColor: colors.disabled },
});

