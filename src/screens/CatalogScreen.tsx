import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export const colors = {
  primary: '#48C0F8',
  primaryDark: '#0284C7',
  primaryLight: '#E0F2FE',
  primarySoft: '#F0F9FF',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceSecondary: '#F8FAFC',
  surfaceMuted: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  badgeDiscount: '#EF4444',
  success: '#10B981',
};

export interface ProductItem {
  id: string;
  nomi: string;
  narx: number;
  eskiNarx?: number;
  ombor?: number;
  rasm?: string;
  model?: string;
  kategoriya?: string;
  aksiya?: boolean;
}

const SAMPLE_PRODUCTS: ProductItem[] = [
  {
    id: 'gazel/filter',
    nomi: 'Moy filtri',
    model: 'Cobalt · Gentra',
    narx: 85000,
    eskiNarx: 100000,
    ombor: 15,
    rasm: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
    kategoriya: 'dvigatel',
    aksiya: true,
  },
  {
    id: 'accessories/holder',
    nomi: 'Telefon tutqichi',
    model: 'Universal',
    narx: 65000,
    ombor: 20,
    rasm: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80',
    kategoriya: 'aksessuarlar',
  },
  {
    id: 'brakes/pads',
    nomi: 'Old tormoz kolodkasi',
    model: 'Cobalt · Nexia 3',
    narx: 145000,
    eskiNarx: 170000,
    ombor: 8,
    rasm: 'https://images.unsplash.com/photo-1600790142055-619df03207e6?auto=format&fit=crop&w=600&q=80',
    kategoriya: 'tormoz',
    aksiya: true,
  },
  {
    id: 'electric/spark',
    nomi: 'Zajigalka svechasi (4 dona)',
    model: 'Gentra 1.5 · Cobalt',
    narx: 120000,
    ombor: 10,
    rasm: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=600&q=80',
    kategoriya: 'elektrika',
  },
  {
    id: 'accessories/dashcam',
    nomi: 'Avtomobil videoregistratori',
    model: 'Full HD 1080p',
    narx: 380000,
    eskiNarx: 420000,
    ombor: 6,
    rasm: 'https://images.unsplash.com/photo-1508974239320-0a029497e820?auto=format&fit=crop&w=600&q=80',
    kategoriya: 'aksessuarlar',
    aksiya: true,
  },
  {
    id: 'engine/belt',
    nomi: 'Generator kamari (Remen)',
    model: 'Cobalt · Nexia',
    narx: 75000,
    ombor: 18,
    rasm: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=600&q=80',
    kategoriya: 'dvigatel',
  },
];

const CATEGORIES = [
  { id: 'aksessuarlar', label: 'Aksessuarlar', icon: 'car-sport-outline' },
  { id: 'dvigatel', label: 'Dvigatel', icon: 'hardware-chip-outline' },
  { id: 'tormoz', label: 'Tormoz', icon: 'disc-outline' },
  { id: 'elektrika', label: 'Elektrika', icon: 'battery-charging-outline' },
  { id: 'all', label: 'Barchasi', icon: 'grid-outline' },
] as const;

function formatPrice(price: number): string {
  return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function CatalogScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({
    'accessories/holder': 1,
  });
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [comparedIds, setComparedIds] = useState<Record<string, boolean>>({});
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price_asc' | 'price_desc' | 'discount'>('default');

  const productsList = useMemo(() => {
    let list = SAMPLE_PRODUCTS.filter((item) => {
      if (selectedCategory !== 'all' && item.kategoriya !== selectedCategory) return false;
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.nomi.toLowerCase().includes(q);
        const matchesModel = (item.model || '').toLowerCase().includes(q);
        if (!matchesName && !matchesModel) return false;
      }
      return true;
    });

    if (sortBy === 'price_asc') list = [...list].sort((a, b) => a.narx - b.narx);
    if (sortBy === 'price_desc') list = [...list].sort((a, b) => b.narx - a.narx);
    if (sortBy === 'discount') list = [...list].sort((a, b) => ((b.eskiNarx || b.narx) - b.narx) - ((a.eskiNarx || a.narx) - a.narx));

    return list;
  }, [selectedCategory, searchQuery, sortBy]);

  const updateCart = (id: string, delta: number) => {
    setCartQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      return { ...prev, [id]: next };
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      {/* 1. Brand Logo & Location */}
      <View style={styles.topBrandBar}>
        <View style={styles.brandWrapper}>
          <Text style={styles.brandTitle}>
            OPTOVIK <Text style={styles.brandNumber}>N99</Text>
          </Text>
          <View style={styles.brandSwoosh} />
        </View>

        <TouchableOpacity style={styles.locationPill} activeOpacity={0.8}>
          <Ionicons name="location-sharp" size={15} color={colors.primaryDark} />
          <Text style={styles.locationText}>Samarqand</Text>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* 2. Search & Filter Bar */}
      <View style={styles.searchRow}>
        <View style={styles.inputWrapper}>
          <Ionicons name="search-outline" size={19} color={colors.textSecondary} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Detal yoki aksessuar qidiring"
            placeholderTextColor={colors.textMuted}
            style={styles.textInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.filterButton, selectedCategory !== 'all' && styles.filterButtonActive]}
          activeOpacity={0.85}
          onPress={() => setIsFilterModalOpen(true)}
        >
          <Ionicons
            name="options-outline"
            size={21}
            color={selectedCategory !== 'all' ? '#FFFFFF' : colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* 3. Promo Banners */}
      {searchQuery.trim().length === 0 && (
        <View style={styles.bannersContainer}>
          <TouchableOpacity
            style={styles.bannerCard}
            activeOpacity={0.9}
            onPress={() => setSelectedCategory('dvigatel')}
          >
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitle}>GM uchun{'\n'}ehtiyot qismlar</Text>
              <Text style={styles.bannerSubtitle}>Cobalt · Gentra · Nexia</Text>
              <View style={styles.actionPill}>
                <Text style={styles.actionPillText}>Qismlarni ko‘rish</Text>
                <Ionicons name="arrow-forward" size={13} color={colors.text} />
              </View>
            </View>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80' }}
              style={styles.bannerImage}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.bannerCard, styles.bannerCardSecond]}
            activeOpacity={0.9}
            onPress={() => setSelectedCategory('aksessuarlar')}
          >
            <View style={styles.bannerContent}>
              <Text style={styles.bannerTitleSmall}>Avtomobilingizga{'\n'}qulaylik</Text>
              <View style={styles.actionPill}>
                <Text style={styles.actionPillText}>Aksessuarlarni ko‘rish</Text>
                <Ionicons name="arrow-forward" size={13} color={colors.text} />
              </View>
            </View>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?auto=format&fit=crop&w=600&q=80' }}
              style={styles.bannerImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      )}

      {/* 4. Category Icons */}
      <View style={styles.categoriesRow}>
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryItem}
              onPress={() => setSelectedCategory(isSelected && cat.id !== 'all' ? 'all' : cat.id)}
            >
              <View style={[styles.categoryIconBox, isSelected && styles.categoryIconBoxSelected]}>
                <Ionicons name={cat.icon as any} size={23} color={isSelected ? '#FFF' : colors.text} />
              </View>
              <Text style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 5. Products Section Title and Sort */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mahsulotlar</Text>
        <TouchableOpacity style={styles.sortButton} onPress={() => setIsSortModalOpen(true)}>
          <Text style={styles.sortButtonText}>
            {sortBy === 'price_asc' ? 'Avval arzon' : sortBy === 'price_desc' ? 'Avval qimmat' : sortBy === 'discount' ? 'Aksiyalar' : 'Saralash'}
          </Text>
          <Ionicons name="swap-vertical-outline" size={14} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <FlatList
        data={productsList}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const qty = cartQuantities[item.id] || 0;
          const isFav = Boolean(savedIds[item.id]);
          const isCompared = Boolean(comparedIds[item.id]);
          const hasDiscount = Boolean(item.eskiNarx && item.eskiNarx > item.narx);

          return (
            <View style={styles.cardContainer}>
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: item.rasm || 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80' }}
                  style={styles.productImage}
                  resizeMode="contain"
                />

                <View style={styles.topLeftBadges}>
                  <TouchableOpacity
                    style={[styles.badgeCircle, isCompared && styles.badgeCircleActive]}
                    onPress={() => setComparedIds((p) => ({ ...p, [item.id]: !p[item.id] }))}
                  >
                    <Ionicons name="scale-outline" size={14} color={isCompared ? colors.primaryDark : colors.textSecondary} />
                  </TouchableOpacity>

                  {hasDiscount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountText}>-15%</Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.topRightBadge}
                  onPress={() => setSavedIds((p) => ({ ...p, [item.id]: !p[item.id] }))}
                >
                  <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={16} color={isFav ? colors.badgeDiscount : colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.cardContent}>
                <Text style={styles.productTitle} numberOfLines={2}>{item.nomi}</Text>
                <Text style={styles.productModel} numberOfLines={1}>{item.model || 'Universal'}</Text>
                <Text style={styles.stockStatus}>Mavjud</Text>

                <View style={styles.priceRow}>
                  <Text style={styles.currentPrice}>{formatPrice(item.narx)} so‘m</Text>
                  {hasDiscount && <Text style={styles.oldPrice}>{formatPrice(item.eskiNarx!)}</Text>}
                </View>

                {qty > 0 ? (
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity onPress={() => updateCart(item.id, -1)} style={styles.stepperBtn}>
                      <Ionicons name="remove" size={18} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{qty}</Text>
                    <TouchableOpacity onPress={() => updateCart(item.id, 1)} style={styles.stepperBtn}>
                      <Ionicons name="add" size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.addToCartButton} activeOpacity={0.85} onPress={() => updateCart(item.id, 1)}>
                    <Ionicons name="bag-handle-outline" size={17} color={colors.text} />
                    <Text style={styles.addToCartText}>Savatga</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={isSortModalOpen} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsSortModalOpen(false)}>
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>Saralash</Text>
            {[
              { id: 'default', label: 'Tavsiya etilgan (Ommabop)' },
              { id: 'price_asc', label: 'Narx: arzonroqdan qimmatroqqa' },
              { id: 'price_desc', label: 'Narx: qimmatroqdan arzonroqqa' },
              { id: 'discount', label: 'Aksiyalar va chegirmalar' },
            ].map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.sheetOption, sortBy === opt.id && styles.sheetOptionActive]}
                onPress={() => {
                  setSortBy(opt.id as any);
                  setIsSortModalOpen(false);
                }}
              >
                <Text style={[styles.sheetOptionText, sortBy === opt.id && styles.sheetOptionTextActive]}>
                  {opt.label}
                </Text>
                {sortBy === opt.id && <Ionicons name="checkmark-circle" size={20} color={colors.primaryDark} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={isFilterModalOpen} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsFilterModalOpen(false)}>
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>Bo‘limlar</Text>
            {[
              { id: 'all', label: 'Barcha mahsulotlar' },
              { id: 'aksessuarlar', label: 'Aksessuarlar' },
              { id: 'dvigatel', label: 'Dvigatel' },
              { id: 'tormoz', label: 'Tormoz' },
              { id: 'elektrika', label: 'Elektrika' },
            ].map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.sheetOption, selectedCategory === cat.id && styles.sheetOptionActive]}
                onPress={() => {
                  setSelectedCategory(cat.id);
                  setIsFilterModalOpen(false);
                }}
              >
                <Text style={[styles.sheetOptionText, selectedCategory === cat.id && styles.sheetOptionTextActive]}>
                  {cat.label}
                </Text>
                {selectedCategory === cat.id && <Ionicons name="checkmark" size={18} color={colors.primaryDark} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

export default CatalogScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { backgroundColor: '#FFFFFF' },
  listContent: { paddingBottom: 50 },
  columnWrapper: { paddingHorizontal: 16, gap: 12 },
  topBrandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    marginBottom: 10,
  },
  brandWrapper: { position: 'relative', paddingBottom: 4 },
  brandTitle: { fontSize: 22, fontWeight: '900', color: colors.text },
  brandNumber: { color: colors.text },
  brandSwoosh: {
    position: 'absolute',
    bottom: 0,
    left: 2,
    width: 68,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 9999,
  },
  locationText: { fontSize: 13, fontWeight: '700', color: colors.text },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  inputWrapper: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  textInput: { flex: 1, height: '100%', fontSize: 14, color: colors.text },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonActive: { backgroundColor: colors.primaryDark },
  bannersContainer: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  bannerCard: {
    height: 140,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    overflow: 'hidden',
  },
  bannerCardSecond: { backgroundColor: '#EBF5FE', borderColor: '#CBE5FD' },
  bannerContent: { flex: 1.2 },
  bannerTitle: { fontSize: 18, fontWeight: '900', color: colors.text, lineHeight: 22 },
  bannerTitleSmall: { fontSize: 17, fontWeight: '800', color: colors.text, lineHeight: 21 },
  bannerSubtitle: { fontSize: 12, color: colors.textSecondary, marginVertical: 6 },
  actionPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionPillText: { fontSize: 12, fontWeight: '700', color: colors.text },
  bannerImage: { flex: 0.9, height: '100%' },
  categoriesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  categoryItem: { alignItems: 'center', width: '18%' },
  categoryIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryIconBoxSelected: { backgroundColor: colors.primaryDark },
  categoryLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary },
  categoryLabelSelected: { color: colors.text, fontWeight: '800' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: { fontSize: 20, fontWeight: '900', color: colors.text },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  sortButtonText: { fontSize: 13, fontWeight: '700', color: colors.text },
  cardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.borderLight,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  imageWrapper: {
    width: '100%',
    height: 146,
    backgroundColor: colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  productImage: { width: '90%', height: '90%' },
  topLeftBadges: { position: 'absolute', top: 8, left: 8, gap: 6 },
  badgeCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  badgeCircleActive: { backgroundColor: colors.primaryLight },
  discountBadge: {
    backgroundColor: colors.badgeDiscount,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  topRightBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  cardContent: { padding: 12 },
  productTitle: { fontSize: 15, fontWeight: '700', color: colors.text, minHeight: 38 },
  productModel: { fontSize: 12, color: colors.textSecondary, marginTop: 3 },
  stockStatus: { fontSize: 11, fontWeight: '600', color: colors.success, marginTop: 4 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginVertical: 8 },
  currentPrice: { fontSize: 16, fontWeight: '800', color: colors.text },
  oldPrice: { fontSize: 12, color: colors.textMuted, textDecorationLine: 'line-through' },
  addToCartButton: {
    height: 42,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  addToCartText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  stepperContainer: {
    height: 42,
    backgroundColor: colors.primary,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  stepperBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 15, fontWeight: '800', color: colors.text },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.45)', justifyContent: 'flex-end' },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  sheetOptionActive: { backgroundColor: colors.primarySoft, paddingHorizontal: 8, borderRadius: 12 },
  sheetOptionText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  sheetOptionTextActive: { color: colors.primaryDark, fontWeight: '800' },
});
