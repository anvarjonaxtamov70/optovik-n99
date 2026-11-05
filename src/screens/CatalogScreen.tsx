import React, { useState } from 'react';
import {
  FlatList,
  Image,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const C = {
  primary: '#48C0F8',
  primaryDark: '#0284C7',
  primaryLight: '#E0F2FE',
  bg: '#FFFFFF',
  cardBg: '#F8FAFC',
  text: '#0F172A',
  sub: '#64748B',
  muted: '#94A3B8',
  red: '#EF4444',
  green: '#10B981',
  border: '#E2E8F0',
};

const ITEMS = [
  { id: '1', nomi: 'Moy filtri', model: 'Cobalt · Gentra', narx: 85000, eski: 100000, rasm: 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=500&q=80', cat: 'dvigatel' },
  { id: '2', nomi: 'Telefon tutqichi', model: 'Universal', narx: 65000, rasm: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500&q=80', cat: 'aksessuarlar' },
  { id: '3', nomi: 'Old tormoz kolodkasi', model: 'Cobalt · Nexia 3', narx: 145000, eski: 170000, rasm: 'https://images.unsplash.com/photo-1600790142055-619df03207e6?w=500&q=80', cat: 'tormoz' },
  { id: '4', nomi: 'Zajigalka svechasi', model: 'Gentra 1.5 · Cobalt', narx: 120000, rasm: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=500&q=80', cat: 'elektrika' },
];

const CATS = [
  { id: 'aksessuarlar', l: 'Aksessuarlar', ic: '🚗' },
  { id: 'dvigatel', l: 'Dvigatel', ic: '⚙️' },
  { id: 'tormoz', l: 'Tormoz', ic: '🔘' },
  { id: 'elektrika', l: 'Elektrika', ic: '⚡' },
  { id: 'all', l: 'Barchasi', ic: '▦' },
];

export default function CatalogScreen() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [cart, setCart] = useState<Record<string, number>>({ '2': 1 });
  const [favs, setFavs] = useState<Record<string, boolean>>({});

  const list = ITEMS.filter((i) => {
    if (cat !== 'all' && i.cat !== cat) return false;
    if (q.trim() && !i.nomi.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const changeCart = (id: string, delta: number) => {
    setCart((prev) => {
      const next = (prev[id] || 0) + delta;
      if (next <= 0) {
        const c = { ...prev };
        delete c[id];
        return c;
      }
      return { ...prev, [id]: next };
    });
  };

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={s.cols}
        contentContainerStyle={s.content}
        ListHeaderComponent={
          <View style={s.head}>
            <View style={s.topBar}>
              <View>
                <Text style={s.logo}>OPTOVIK N99</Text>
                <View style={s.swoosh} />
              </View>
              <View style={s.locPill}>
                <Text style={s.locTxt}>📍 Samarqand ⌄</Text>
              </View>
            </View>

            <View style={s.searchRow}>
              <View style={s.inputWrap}>
                <Text style={{ fontSize: 16 }}>🔍</Text>
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Detal yoki aksessuar qidiring"
                  placeholderTextColor={C.muted}
                  style={s.input}
                />
              </View>
              <TouchableOpacity style={s.filterBtn} onPress={() => setCat('all')}>
                <Text style={{ fontSize: 18 }}>🎛️</Text>
              </TouchableOpacity>
            </View>

            {!q.trim() && (
              <View style={s.banners}>
                <View style={s.banner1}>
                  <View style={{ flex: 1.2 }}>
                    <Text style={s.bTitle}>GM uchun{'\n'}ehtiyot qismlar</Text>
                    <Text style={s.bSub}>Cobalt · Gentra · Nexia</Text>
                    <TouchableOpacity style={s.pillBtn} onPress={() => setCat('dvigatel')}>
                      <Text style={s.pillTxt}>Qismlarni ko‘rish →</Text>
                    </TouchableOpacity>
                  </View>
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=500&q=80' }} style={s.bImg} resizeMode="contain" />
                </View>

                <View style={s.banner2}>
                  <View style={{ flex: 1.2 }}>
                    <Text style={s.bTitle}>Avtomobilingizga{'\n'}qulaylik</Text>
                    <TouchableOpacity style={s.pillBtn} onPress={() => setCat('aksessuarlar')}>
                      <Text style={s.pillTxt}>Aksessuarlar →</Text>
                    </TouchableOpacity>
                  </View>
                  <Image source={{ uri: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=500&q=80' }} style={s.bImg} resizeMode="contain" />
                </View>
              </View>
            )}

            <View style={s.catsRow}>
              {CATS.map((c) => {
                const active = cat === c.id;
                return (
                  <TouchableOpacity key={c.id} style={s.catItem} onPress={() => setCat(c.id)}>
                    <View style={[s.catBox, active && s.catBoxActive]}>
                      <Text style={{ fontSize: 20 }}>{c.ic}</Text>
                    </View>
                    <Text style={[s.catLabel, active && s.catLabelActive]} numberOfLines={1}>{c.l}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={s.secHead}>
              <Text style={s.secTitle}>Mahsulotlar</Text>
              <View style={s.sortPill}><Text style={s.sortTxt}>Saralash ⥯</Text></View>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const count = cart[item.id] || 0;
          const isFav = favs[item.id];
          return (
            <View style={s.card}>
              <View style={s.imgBox}>
                <Image source={{ uri: item.rasm }} style={s.pImg} resizeMode="contain" />
                <View style={s.badgesL}>
                  <View style={s.bCircle}><Text style={{ fontSize: 13 }}>⚖️</Text></View>
                  {item.eski && <View style={s.discBadge}><Text style={s.discTxt}>-15%</Text></View>}
                </View>
                <TouchableOpacity style={s.badgeR} onPress={() => setFavs((p) => ({ ...p, [item.id]: !p[item.id] }))}>
                  <Text style={{ fontSize: 14 }}>{isFav ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
              </View>

              <View style={s.pBody}>
                <Text style={s.pTitle} numberOfLines={2}>{item.nomi}</Text>
                <Text style={s.pModel}>{item.model}</Text>
                <Text style={s.pStock}>Mavjud</Text>
                <View style={s.priceRow}>
                  <Text style={s.priceNow}>{item.narx.toLocaleString()} so‘m</Text>
                </View>

                {count > 0 ? (
                  <View style={s.stepper}>
                    <TouchableOpacity onPress={() => changeCart(item.id, -1)} style={s.stepBtn}><Text style={s.stepTxt}>−</Text></TouchableOpacity>
                    <Text style={s.stepVal}>{count}</Text>
                    <TouchableOpacity onPress={() => changeCart(item.id, 1)} style={s.stepBtn}><Text style={s.stepTxt}>+</Text></TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={s.buyBtn} onPress={() => changeCart(item.id, 1)}>
                    <Text style={s.buyTxt}>🛍️ Savatga</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF' },
  head: { backgroundColor: '#FFF' },
  content: { paddingBottom: 60 },
  cols: { paddingHorizontal: 16, gap: 12 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, marginBottom: 12 },
  logo: { fontSize: 22, fontWeight: '900', color: C.text },
  swoosh: { width: 65, height: 3, backgroundColor: C.primary, borderRadius: 2, marginTop: 2 },
  locPill: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  locTxt: { fontSize: 13, fontWeight: '700', color: C.text },
  searchRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 16 },
  inputWrap: { flex: 1, height: 48, backgroundColor: '#FFF', borderRadius: 16, borderWidth: 1, borderColor: C.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8 },
  input: { flex: 1, height: '100%', fontSize: 14, color: C.text },
  filterBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  banners: { paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  banner1: { height: 138, borderRadius: 18, backgroundColor: '#E0F2FE', flexDirection: 'row', padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#BAE6FD', overflow: 'hidden' },
  banner2: { height: 138, borderRadius: 18, backgroundColor: '#EBF5FE', flexDirection: 'row', padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#CBE5FD', overflow: 'hidden' },
  bTitle: { fontSize: 17, fontWeight: '900', color: C.text, lineHeight: 21 },
  bSub: { fontSize: 12, color: C.sub, marginVertical: 4 },
  pillBtn: { alignSelf: 'flex-start', backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 6 },
  pillTxt: { fontSize: 12, fontWeight: '700', color: C.text },
  bImg: { flex: 0.9, height: '100%' },
  catsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  catItem: { alignItems: 'center', width: '18%' },
  catBox: { width: 50, height: 50, borderRadius: 14, backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  catBoxActive: { backgroundColor: C.primaryDark },
  catLabel: { fontSize: 11, fontWeight: '600', color: C.sub },
  catLabelActive: { color: C.text, fontWeight: '800' },
  secHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  secTitle: { fontSize: 20, fontWeight: '900', color: C.text },
  sortPill: { backgroundColor: C.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  sortTxt: { fontSize: 12, fontWeight: '700', color: C.text },
  card: { flex: 1, backgroundColor: '#FFF', borderRadius: 18, borderWidth: 1, borderColor: '#F1F5F9', overflow: 'hidden', marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  imgBox: { width: '100%', height: 140, backgroundColor: C.cardBg, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  pImg: { width: '90%', height: '90%' },
  badgesL: { position: 'absolute', top: 8, left: 8, gap: 5 },
  bCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  discBadge: { backgroundColor: C.red, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 6 },
  discTxt: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  badgeR: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2 },
  pBody: { padding: 12 },
  pTitle: { fontSize: 14, fontWeight: '700', color: C.text, minHeight: 36 },
  pModel: { fontSize: 12, color: C.sub, marginTop: 2 },
  pStock: { fontSize: 11, fontWeight: '600', color: C.green, marginTop: 4 },
  priceRow: { marginVertical: 6 },
  priceNow: { fontSize: 15, fontWeight: '800', color: C.text },
  buyBtn: { height: 40, backgroundColor: C.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buyTxt: { color: C.text, fontSize: 14, fontWeight: '700' },
  stepper: { height: 40, backgroundColor: C.primary, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10 },
  stepBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  stepTxt: { fontSize: 20, fontWeight: '900', color: C.text },
  stepVal: { fontSize: 15, fontWeight: '800', color: C.text },
});
