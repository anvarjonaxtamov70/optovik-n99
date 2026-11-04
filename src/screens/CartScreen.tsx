import { router } from 'expo-router';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CartNotice, ConnectionStatus, EmptyState, ScreenHeader } from '../components/ShopUI';
import { useShop } from '../store/ShopProvider';
import { cartLines, cartSummary, categoryLabel, formatMoney } from '../store/shop';
import { colors, ui } from '../theme';

export default function CartScreen() {
  const { state, dispatch } = useShop();
  const items = cartLines(state);
  const { count, total } = cartSummary(state);

  return (
    <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}>
      <View style={ui.body}>
        <ScreenHeader title="Savat" subtitle={count ? `${items.length} xil mahsulot · ${count} dona` : 'Tanlagan mahsulotlaringiz shu yerda'} />
        <ConnectionStatus />
        <CartNotice />
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[ui.list, items.length === 0 && ui.emptyList]}
          ListEmptyComponent={<EmptyState title="Savatingiz bo‘sh" message="Katalogdan kerakli mahsulotni tanlab, «Savatga» tugmasini bosing." action={{ label: 'Katalogga o‘tish', onPress: () => router.navigate('/') }} />}
          renderItem={({ item }) => (
            <View style={ui.card}>
              <View style={ui.row}>
                <Text style={[ui.category, styles.flex]}>{categoryLabel(item.kategoriya)}</Text>
                <Pressable accessibilityRole="button" accessibilityLabel={`${item.nomi}: savatdan olib tashlash`} onPress={() => dispatch({ type: 'remove', id: item.id })} style={({ pressed }) => [styles.remove, pressed && ui.pressed]}>
                  <Text style={styles.removeText}>Olib tashlash</Text>
                </Pressable>
              </View>
              <Text style={ui.name}>{item.nomi}</Text>
              <Text style={ui.secondary}>{formatMoney(item.narxi)} / dona</Text>
              <Text style={ui.secondary}>Qoldiq: {item.qoldiq} dona</Text>
              <View style={styles.quantityRow}>
                <View style={styles.stepper}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.nomi}: miqdorni kamaytirish`}
                    accessibilityState={{ disabled: item.quantity <= 1 }}
                    disabled={item.quantity <= 1}
                    onPress={() => dispatch({ type: 'quantity', id: item.id, delta: -1 })}
                    style={({ pressed }) => [styles.stepButton, item.quantity <= 1 && ui.disabled, pressed && ui.pressed]}
                  ><Text style={styles.stepText}>−</Text></Pressable>
                  <Text style={styles.quantity} accessibilityLabel={`${item.quantity} dona`}>{item.quantity}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${item.nomi}: miqdorni oshirish`}
                    accessibilityState={{ disabled: item.quantity >= item.qoldiq || state.status !== 'ready' }}
                    disabled={item.quantity >= item.qoldiq || state.status !== 'ready'}
                    onPress={() => dispatch({ type: 'quantity', id: item.id, delta: 1 })}
                    style={({ pressed }) => [styles.stepButton, (item.quantity >= item.qoldiq || state.status !== 'ready') && ui.disabled, pressed && ui.pressed]}
                  ><Text style={styles.stepText}>+</Text></Pressable>
                </View>
                <Text style={styles.lineTotal}>{formatMoney(item.narxi * item.quantity)}</Text>
              </View>
              {item.quantity >= item.qoldiq && <Text style={ui.secondary}>Mavjud qoldiq chegarasiga yetdingiz.</Text>}
            </View>
          )}
        />
        {items.length > 0 && (
          <View style={styles.summary} accessibilityLiveRegion="polite">
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Jami · {count} dona</Text>
              <Text style={ui.price}>{formatMoney(total)}</Text>
            </View>
            <Text style={ui.secondary}>Narxlar va qoldiq jonli yangilanadi.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  remove: { minHeight: 44, paddingHorizontal: 8, justifyContent: 'center' },
  removeText: { color: colors.text, textDecorationLine: 'underline', fontSize: 13, fontWeight: '600' },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepButton: { minWidth: 46, minHeight: 46, borderRadius: 13, backgroundColor: colors.blue, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: colors.text, fontSize: 24, fontWeight: '600' },
  quantity: { minWidth: 32, textAlign: 'center', color: colors.text, fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] },
  lineTotal: { fontSize: 18, fontWeight: '800', color: colors.text, fontVariant: ['tabular-nums'], flexShrink: 1 },
  summary: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.border, paddingHorizontal: 20, paddingVertical: 18, gap: 8 },
  totalRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: colors.text },
});
