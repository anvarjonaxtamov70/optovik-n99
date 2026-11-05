import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { defaultCatalogOptions, type CatalogOptions, type CatalogSort } from '../store/catalog';
import { colors, ui } from '../theme';
import { Icon } from './Icon';
import { ActionButton } from './ShopUI';

const sorts: { id: CatalogSort; title: string }[] = [
  { id: 'default', title: 'Odatiy tartib' }, { id: 'price-asc', title: 'Narx: arzonidan' }, { id: 'price-desc', title: 'Narx: qimmatidan' }, { id: 'name', title: 'Nomi bo‘yicha' },
];
export function CatalogFilters({ initial, onApply, onClose }: { initial: CatalogOptions; onApply: (options: CatalogOptions) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(initial);
  return <Modal transparent visible animationType="none" onRequestClose={onClose}>
    <View style={styles.modal}>
      <Pressable accessibilityRole="button" accessibilityLabel="Filtrni yopish" onPress={onClose} style={StyleSheet.absoluteFill} />
      <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheet} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={ui.row}><Text style={ui.name} accessibilityRole="header">Filtr va saralash</Text><Pressable style={styles.close} onPress={onClose} accessibilityLabel="Yopish" accessibilityRole="button"><Icon name="close" /></Pressable></View>
          {sorts.map((sort) => <Pressable key={sort.id} accessibilityRole="radio" accessibilityState={{ checked: draft.sort === sort.id }} onPress={() => setDraft({ ...draft, sort: sort.id })} style={styles.option}>
            <Text style={styles.label}>{sort.title}</Text><View style={[styles.radio, draft.sort === sort.id && styles.selected]}>{draft.sort === sort.id && <Icon name="check" size={15} />}</View>
          </Pressable>)}
          <View style={styles.toggle}><Text style={styles.label}>Faqat mavjud mahsulotlar</Text><Switch accessibilityLabel="Faqat mavjud mahsulotlar" value={draft.availableOnly} onValueChange={(availableOnly) => setDraft({ ...draft, availableOnly })} trackColor={{ true: colors.blue }} /></View>
          <View style={styles.toggle}><Text style={styles.label}>Faqat aksiyalar</Text><Switch accessibilityLabel="Faqat aksiyalar" value={draft.saleOnly} onValueChange={(saleOnly) => setDraft({ ...draft, saleOnly })} trackColor={{ true: colors.blue }} /></View>
          <ActionButton label="Natijalarni ko‘rsatish" onPress={() => onApply(draft)} />
          <Pressable onPress={() => setDraft(defaultCatalogOptions)} accessibilityRole="button" style={styles.reset}><Text style={styles.label}>Filtrlarni tozalash</Text></Pressable>
        </ScrollView>
      </SafeAreaView>
    </View>
  </Modal>;
}
const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: '#0c1e3544' },
  sheet: { maxHeight: '90%', backgroundColor: colors.white, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  content: { padding: 20, gap: 10 }, close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  option: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between', paddingVertical: 8 },
  label: { fontSize: 15, lineHeight: 22, color: colors.text, flexShrink: 1 },
  radio: { width: 24, height: 24, borderRadius: 12, borderColor: colors.border, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  selected: { backgroundColor: colors.blue, borderColor: colors.blue },
  toggle: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reset: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
});
