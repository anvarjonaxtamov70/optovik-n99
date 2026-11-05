import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, ConnectionStatus, EmptyState } from '../components/ShopUI';
import { ProductPhoto } from '../components/ProductPhoto';
import { useShop } from '../store/ShopProvider';
import { formatMoney } from '../store/shop';
import { colors, ui } from '../theme';

export default function CompareScreen() {
  const { state, compareIds, toggleCompare } = useShop();
  const products = state.products.filter((p) => compareIds.includes(p.id));
  return <SafeAreaView style={ui.screen} edges={['bottom', 'left', 'right']}><View style={ui.body}><ConnectionStatus />
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={ui.secondary}>Narx, mos model va mavjud qoldiqni solishtiring.</Text>
      {products.length === 2 ? <View style={styles.columns}>{products.map((p) => <View key={p.id} style={styles.column}>
        <View style={styles.image}><ProductPhoto product={p} /></View>
        <Text style={styles.name}>{p.nomi}</Text>
        <Text style={styles.label}>Narx</Text><Text style={styles.value}>{formatMoney(p.narxi)}</Text>
        <Text style={styles.label}>Mos model</Text><Text style={styles.value}>{p.model || 'Ko‘rsatilmagan'}</Text>
        <Text style={styles.label}>Artikul</Text><Text style={styles.value}>{p.artikul || 'Ko‘rsatilmagan'}</Text>
        <Text style={styles.label}>Mavjud qoldiq</Text><Text style={styles.value}>{p.qoldiq} dona</Text>
        <ActionButton label="Olib tashlash" onPress={() => toggleCompare(p.id)} />
      </View>)}</View> : <EmptyState title="Ikkita mahsulot tanlang" message="Katalogdagi tarozi tugmasi orqali solishtirmoqchi bo‘lgan mahsulotlarni tanlang." />}
    </ScrollView>
  </View></SafeAreaView>;
}
const styles = StyleSheet.create({
  content: { padding: 16, gap: 18 }, columns: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  column: { flex: 1, gap: 10 }, image: { borderRadius: 16, overflow: 'hidden' },
  name: { minHeight: 52, fontSize: 16, lineHeight: 22, fontWeight: '700', color: colors.text },
  label: { fontSize: 12, color: colors.muted, marginTop: 8 },
  value: { fontSize: 14, lineHeight: 21, color: colors.text },
});
