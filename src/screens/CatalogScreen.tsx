import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';

const CATEGORIES = [
  { id: 'aksessuarlar', label: 'Aksessuarlar', icon: 'car-sport-outline' },
  { id: 'dvigatel', label: 'Dvigatel', icon: 'hardware-chip-outline' },
  { id: 'tormoz', label: 'Tormoz', icon: 'disc-outline' },
  { id: 'elektrika', label: 'Elektrika', icon: 'battery-charging-outline' },
  { id: 'all', label: 'Barchasi', icon: 'grid-outline' },
] as const;

export const CatalogScreen = () => {
  const {
    products,
    cart,
    savedProductIds,
    addToCart,
    updateCartQuantity,
    toggleSaveProduct,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        const matchesCategory =
          selectedCategory === 'all' ||
          item.kategoriya?.toLowerCase() === selectedCategory.toLowerCase();
        const matchesSearch =
          item.nomi.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.artikul?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.model?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => (sortOrder === 'asc' ? a.narx - b.narx : b.narx - a.narx));
  }, [products, selectedCategory, searchQuery, sortOrder]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* 1. Yuqori qism: Brend va Lokatsiya */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brandTitle}>OPTOVIK N99</Text>
          <View style={styles.brandAccentLine} />
        </View>
        <TouchableOpacity style={styles.locationBadge} activeOpacity={0.7}>
          <Ionicons name="location-sharp" size={15} color="#0284C7" />
          <Text style={styles.locationText}>Samarqand</Text>
          <Ionicons name="chevron-down" size={14} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* 2. Qidiruv va Filtr */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Ionicons name="search-outline" size={19} color="#64748B" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Detal yoki aksessuar qidiring"
            placeholderTextColor="#94A3B8"
            style={styles.searchInput}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
          activeOpacity={0.8}
        >
          <Ionicons name="options-outline" size={21} color="#0F172A" />
        </TouchableOpacity>
      </View>

      {/* 3. Aksiya bannerlari */}
      <View style={styles.bannerContainer}>
        {/* GM Banner */}
        <TouchableOpacity
          style={styles.gmBanner}
          activeOpacity={0.9}
          onPress={() => setSelectedCategory('all')}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>{'GM uchun\nehtiyot qismlar'}</Text>
            <Text style={styles.bannerSubtitle}>Cobalt · Gentra · Nexia</Text>
            <View style={styles.bannerActionBtn}>
              <Text style={styles.bannerActionBtnText}>Qismlarni ko‘rish</Text>
              <Ionicons name="arrow-forward" size={13} color="#0F172A" />
            </View>
          </View>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80',
            }}
            style={styles.bannerImage}
            resizeMode="contain"
          />
        </TouchableOpacity>

        {/* Aksessuar Banner */}
        <TouchableOpacity
          style={styles.accBanner}
          activeOpacity={0.9}
          onPress={() => setSelectedCategory('aksessuarlar')}
        >
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>{'Avtomobilingizga\nqulaylik'}</Text>
            <View style={[styles.bannerActionBtn, { marginTop: 10 }]}>
              <Text style={styles.bannerActionBtnText}>Aksessuarlarni ko‘rish</Text>
              <Ionicons name="arrow-forward" size={13} color="#0F172A" />
            </View>
          </View>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1584345604476-8ec5e12e42dd?auto=format&fit=crop&w=600&q=80',
            }}
            style={styles.bannerImageSmall}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* 4. Bo‘limlar qatori */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={styles.categoryItem}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.categoryIconBox,
                  isSelected && styles.categoryIconBoxSelected,
                ]}
              >
                <Ionicons
                  name={cat.icon}
                  size={23}
                  color={isSelected ? '#0284C7' : '#0F172A'}
                />
              </View>
              <Text
                style={[
                  styles.categoryLabel,
                  isSelected && styles.categoryLabelSelected,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* 5. Mahsulotlar sarlavhasi va saralash */}
      <View style={styles.catalogHeadingRow}>
        <Text style={styles.catalogTitle}>Mahsulotlar</Text>
        <TouchableOpacity
          style={styles.sortToggleBtn}
          onPress={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
        >
          <Text style={styles.sortToggleText}>Saralash</Text>
          <Ionicons
            name={sortOrder === 'asc' ? 'swap-vertical' : 'swap-vertical-outline'}
            size={14}
            color="#0284C7"
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const cartItem = cart.find((c) => c.mahsulotId === item.id);
          const quantity = cartItem?.miqdor || 0;
          const isSaved = savedProductIds.includes(item.id);
          const hasDiscount = Boolean(item.eskiNarx && item.eskiNarx > item.narx);

          return (
            <View style={styles.cardContainer}>
              <View style={styles.cardMediaArea}>
                <Image
                  source={{
                    uri:
                      item.rasm ||
                      'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=600&q=80',
                  }}
                  style={styles.cardImage}
                  resizeMode="contain"
                />

                {/* Tarozi va Aksiya nishonlari */}
                <View style={styles.leftBadges}>
                  <View style={styles.circleBadge}>
                    <Ionicons name="scale-outline" size={15} color="#475569" />
                  </View>
                  {hasDiscount && (
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>-15%</Text>
                    </View>
                  )}
                </View>

                {/* Sevimlilar yurakchasi */}
                <TouchableOpacity
                  style={styles.heartBadge}
                  onPress={() => toggleSaveProduct(item.id)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isSaved ? 'heart' : 'heart-outline'}
                    size={16}
                    color={isSaved ? '#EF4444' : '#0F172A'}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.cardDetailsArea}>
                <Text style={styles.cardName} numberOfLines={2}>
                  {item.nomi}
                </Text>
                <Text style={styles.cardModel} numberOfLines={1}>
                  {item.model || 'Universal'}
                </Text>
                <Text style={styles.cardStockText}>Mavjud</Text>

                <View style={styles.priceRow}>
                  <Text style={styles.priceCurrent}>
                    {item.narx?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} so‘m
                  </Text>
                  {hasDiscount && (
                    <Text style={styles.priceOld}>
                      {item.eskiNarx?.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                    </Text>
                  )}
                </View>

                {quantity > 0 ? (
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateCartQuantity(item.id, quantity - 1)}
                    >
                      <Ionicons name="remove" size={18} color="#0F172A" />
                    </TouchableOpacity>
                    <Text style={styles.stepperQtyText}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateCartQuantity(item.id, quantity + 1)}
                    >
                      <Ionicons name="add" size={18} color="#0F172A" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.cartButton}
                    onPress={() => addToCart(item.id, 1)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="bag-handle-outline" size={16} color="#0F172A" />
                    <Text style={styles.cartButtonText}>Savatga</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 40,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.3,
  },
  brandAccentLine: {
    width: 60,
    height: 3,
    backgroundColor: '#48C0F8',
    borderRadius: 2,
    marginTop: 2,
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  searchInputWrapper: {
    flex: 1,
    height: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerContainer: {
    gap: 10,
    marginBottom: 16,
  },
  gmBanner: {
    height: 140,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    overflow: 'hidden',
  },
  accBanner: {
    height: 110,
    borderRadius: 18,
    backgroundColor: '#F0F9FF',
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0F2FE',
    overflow: 'hidden',
  },
  bannerContent: {
    flex: 1.2,
  },
  bannerTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 22,
  },
  bannerSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginVertical: 4,
  },
  bannerActionBtn: {
    alignSelf: 'flex-start',
    backgroundColor: '#48C0F8',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  bannerActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
  },
  bannerImage: {
    flex: 0.9,
    height: '100%',
  },
  bannerImageSmall: {
    flex: 0.8,
    height: '90%',
  },
  categoryScroll: {
    gap: 12,
    paddingBottom: 16,
  },
  categoryItem: {
    alignItems: 'center',
    width: 68,
  },
  categoryIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryIconBoxSelected: {
    backgroundColor: '#E0F2FE',
    borderColor: '#BAE6FD',
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: '#0284C7',
    fontWeight: '800',
  },
  catalogHeadingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  catalogTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  sortToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  sortToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  columnWrapper: {
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    marginBottom: 14,
    overflow: 'hidden',
  },
  cardMediaArea: {
    width: '100%',
    height: 140,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardImage: {
    width: '88%',
    height: '88%',
  },
  leftBadges: {
    position: 'absolute',
    top: 8,
    left: 8,
    gap: 5,
  },
  circleBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  discountBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  heartBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetailsArea: {
    padding: 10,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    minHeight: 36,
  },
  cardModel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  cardStockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#10B981',
    marginTop: 3,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 6,
  },
  priceCurrent: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  priceOld: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  cartButton: {
    height: 38,
    backgroundColor: '#48C0F8',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cartButtonText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '700',
  },
  stepperContainer: {
    height: 38,
    backgroundColor: '#48C0F8',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  stepperBtn: {
    padding: 4,
  },
  stepperQtyText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
});

export default CatalogScreen;
