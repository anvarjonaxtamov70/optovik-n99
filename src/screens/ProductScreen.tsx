import { useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionButton, ConnectionStatus, EmptyState } from '../components/ShopUI';
import { ProductPhoto } from '../components/StoreUI';
import { useShop } from '../store/ShopProvider';
import { categoryLabel, formatMoney } from '../store/shop';
import { ui } from '../theme';

export default function ProductScreen() {
  const params = useLocalSearchParams<{ category: string; id: string }>();
  const { state, dispatch, favorites, toggleFavorite } = useShop();
  const p = state.products.find((x) => x.id === params.category + '/' + params.id);
  if (!p) return <View style={[ui.screen, { padding: 20 }]}><ConnectionStatus /><EmptyState title="Mahsulot topilmadi" message="Mahsulot olib tashlangan yoki hali yuklanmagan." /></View>;
  const quantity = state.quantities[p.id] ?? 0;
  return <SafeAreaView style={ui.screen} edges={['bottom', 'left', 'right']}><View style={ui.body}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}><ProductPhoto key={p.rasm} product={p} large />
      <Text style={ui.category}>{categoryLabel(p.kategoriya)}</Text><Text style={[ui.name, { fontSize: 27, lineHeight: 34 }]}>{p.nomi}</Text>
      <Text style={ui.price}>{formatMoney(p.narxi)}</Text>
      {p.eskiNarx ? <Text style={[ui.secondary, { textDecorationLine: 'line-through' }]}>{formatMoney(p.eskiNarx)}</Text> : null}
      <View style={ui.card}>
        <Text style={ui.secondary}>Artikul: {p.artikul || 'Ko‘rsatilmagan'}</Text><Text style={ui.secondary}>Mos model: {p.model || 'Ko‘rsatilmagan'}</Text>
        <Text style={ui.secondary}>Omborda: {p.qoldiq} dona</Text>
      </View>
      <Text style={ui.name}>Tavsif</Text><Text style={ui.secondary}>{p.tavsif || 'Batafsil tavsif hali qo‘shilmagan. Buyurtmadan oldin avtomobilingizga mosligini tekshiring.'}</Text>
      <ActionButton label={favorites.includes(p.id) ? '♥ Sevimlilarda' : '♡ Sevimlilarga saqlash'} onPress={() => toggleFavorite(p.id)} />
      <ConnectionStatus />
    </ScrollView>
    <View style={[ui.card, { margin: 16 }]}><ActionButton label={quantity ? 'Savatda ' + quantity + ' dona · Yana qo‘shish' : 'Savatga qo‘shish'} disabled={state.status !== 'ready' || quantity >= p.qoldiq} onPress={() => dispatch({ type: 'quantity', id: p.id, delta: 1 })} /></View>
  </View></SafeAreaView>;
}
