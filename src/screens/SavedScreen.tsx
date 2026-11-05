import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConnectionStatus, EmptyState, ScreenHeader } from '../components/ShopUI';
import { ProductCard } from '../components/StoreUI';
import { CompareTray } from '../components/CompareTray';
import { useProductGrid } from '../components/useProductGrid';
import { useShop } from '../store/ShopProvider';
import { ui } from '../theme';

export default function SavedScreen() {
  const { state, favorites } = useShop();
  const { columns, cardWidth } = useProductGrid();
  return <SafeAreaView style={ui.screen} edges={['top', 'left', 'right']}><View style={ui.body}>
    <FlatList key={columns} data={state.products.filter((p) => favorites.includes(p.id))} keyExtractor={(p) => p.id} numColumns={columns} columnWrapperStyle={columns === 2 ? { gap: 12 } : undefined} contentContainerStyle={{ padding: 16, gap: 12 }}
      ListHeaderComponent={<><ScreenHeader inset={false} title="Sevimlilar" subtitle="Yoqtirgan detallaringiz shu yerda" /><ConnectionStatus /></>}
      ListEmptyComponent={<EmptyState title="Hali mahsulot saqlanmagan" message="Mahsulotdagi yurak belgisini bosing." />} renderItem={({ item }) => <ProductCard product={item} width={cardWidth} />} />
    <CompareTray />
  </View></SafeAreaView>;
}
