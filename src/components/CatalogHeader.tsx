import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, shadows, ui } from '../theme';
import { Icon } from './Icon';

export const shopAddress = 'Yangi Samarqand zapchast bozori, 19-sektor, 2-do‘kon.';
export function CatalogHeader({ query, onQuery, onFocus, onBlur, onFilter, filterCount }: {
  query: string; onQuery: (value: string) => void; onFocus: () => void; onBlur: () => void; onFilter: () => void; filterCount: number;
}) {
  return <View style={styles.header}>
    <View style={styles.top}>
      <View style={styles.brand}><Text style={styles.name}>OPTOVIK N99</Text><View style={styles.line} /></View>
      <Pressable onPress={() => Alert.alert('Do‘kon manzili', shopAddress)} accessibilityRole="button" accessibilityLabel="Samarqanddagi do‘kon manzilini ko‘rish" style={({ pressed }) => [styles.location, pressed && ui.pressed]}>
        <Icon name="pin" size={18} color={colors.accent} /><Text style={styles.locationText}>Samarqand</Text>
      </Pressable>
    </View>
    <View style={styles.searchRow}>
      <View style={[styles.search, shadows.small]}><Icon name="search" size={20} />
        <TextInput value={query} onChangeText={onQuery} onFocus={onFocus} onBlur={onBlur} accessibilityLabel="Detal, aksessuar, artikul yoki model qidirish"
          placeholder="Detal yoki aksessuar qidiring" placeholderTextColor={colors.muted} style={styles.input} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
        {!!query && <Pressable onPress={() => onQuery('')} accessibilityRole="button" accessibilityLabel="Qidiruvni tozalash" style={styles.clear}><Icon name="close" size={18} /></Pressable>}
      </View>
      <Pressable onPress={onFilter} accessibilityRole="button" accessibilityLabel={filterCount ? `Filtrlar, ${filterCount} ta faol` : 'Filtr va saralashni ochish'} style={({ pressed }) => [styles.filter, shadows.small, pressed && ui.pressed]}>
        <Icon name="filter" />{filterCount > 0 && <View style={styles.dot}><Text style={styles.dotText}>{filterCount}</Text></View>}
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12, backgroundColor: '#ffffffef', gap: 13 },
  top: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', columnGap: 8 },
  brand: { flexShrink: 1 }, name: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.8 },
  line: { height: 3, width: 75, backgroundColor: colors.blue, borderRadius: 2, marginTop: 2 },
  location: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 48 },
  locationText: { color: colors.text, fontSize: 12, fontWeight: '600' },
  searchRow: { flexDirection: 'row', gap: 9 },
  search: { flex: 1, minWidth: 0, minHeight: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 13, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border },
  input: { flex: 1, minWidth: 0, color: colors.text, fontSize: 14, paddingVertical: 13, paddingRight: 8 },
  clear: { width: 40, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  filter: { width: 50, minHeight: 50, borderRadius: 16, backgroundColor: colors.blueLight, alignItems: 'center', justifyContent: 'center' },
  dot: { position: 'absolute', right: 1, top: 1, backgroundColor: colors.blue, borderRadius: 10, minWidth: 19, padding: 2, alignItems: 'center' },
  dotText: { color: colors.text, fontSize: 10, fontWeight: '800' },
});
