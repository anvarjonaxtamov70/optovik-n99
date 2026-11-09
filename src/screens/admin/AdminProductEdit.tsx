import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ZoomIn, ZoomOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ProductImage } from '../../components/shop/ProductImage';
import { Button } from '../../components/ui/Button';
import { Card, Chip, SwitchRow } from '../../components/ui/Controls';
import { Field } from '../../components/ui/Field';
import { goBack, Header } from '../../components/ui/Header';
import { IconButton } from '../../components/ui/IconButton';
import { Txt } from '../../components/ui/Txt';
import { CAR_MODELS, CATEGORIES, categoryLabel } from '../../domain/taxonomy';
import { useT, type TKey } from '../../i18n';
import { classifyError } from '../../lib/firebase';
import { haptic } from '../../lib/haptics';
import { deleteProduct, formFromProduct, saveProduct, uploadImage, validateProduct, type ProductForm } from '../../state/admin';
import { useProduct, useProducts, useSettings } from '../../state/catalog';
import { showToast } from '../../state/toast';
import { colors, radius } from '../../theme/tokens';

const UNITS = ['dona', 'komplekt', 'juft', 'litr', 'metr'];

export default function AdminProductEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useProduct(id ?? '');
  return <Editor key={existing?.id ?? 'new'} existing={existing} />;
}

function Editor({ existing }: { existing?: ReturnType<typeof useProduct> }) {
  const [form, setForm] = useState<ProductForm>(() => formFromProduct(existing));
  const insets = useSafeAreaInsets();
  const { t, lang, money } = useT();
  const settings = useSettings();
  const products = useProducts();
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  const errors = validateProduct(form);
  const err = (k: keyof ProductForm) => (touched && errors[k] ? t(`admin.product.err.${errors[k]}` as TKey) : null);
  const set = (patch: Partial<ProductForm>) => setForm((f) => ({ ...f, ...patch }));
  const categories = Array.from(new Set([...CATEGORIES.map((c) => c.slug), ...products.map((p) => p.kategoriya)]));
  const canUpload = (!!settings.cloudinaryCloud && !!settings.cloudinaryPreset) || !!settings.imgbbApiKey;

  const toggleModel = (name: string) => {
    const parts = form.model.split(/[,;/]+/).map((s) => s.trim()).filter(Boolean);
    const has = parts.some((p) => p.toLowerCase() === name.toLowerCase());
    set({ model: (has ? parts.filter((p) => p.toLowerCase() !== name.toLowerCase()) : [...parts, name]).join(', ') });
  };
  const hasModel = (name: string) => form.model.toLowerCase().split(/[,;/]+/).map((s) => s.trim()).includes(name.toLowerCase());

  const pick = async () => {
    if (!canUpload) { Alert.alert(t('admin.product.upload'), t('admin.product.uploadOff')); return; }
    
    // Ruxsat so'rash
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t('admin.product.uploadPermission'), t('admin.product.uploadPermissionText'));
      return;
    }
    
    const res = await ImagePicker.launchImageLibraryAsync({ 
      mediaTypes: ['images'], 
      quality: 0.85, 
      allowsEditing: true, 
      aspect: [1, 1],
      allowsMultipleSelection: false 
    });
    
    if (res.canceled || !res.assets[0]) return;
    setUploading(true);
    
    try {
      const link = settings.imgbbApiKey 
        ? await uploadImage(res.assets[0].uri, settings.imgbbApiKey)
        : await uploadImage(res.assets[0].uri, settings.cloudinaryCloud, settings.cloudinaryPreset);
      set({ rasmlar: [...form.rasmlar, link].slice(0, 10) });
      haptic.success();
    } catch (e) {
      haptic.warning();
      showToast(String((e as Error).message ?? t('common.error')), { kind: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    setTouched(true);
    if (Object.keys(errors).length) { haptic.warning(); return; }
    setBusy(true);
    try {
      await saveProduct(form, existing);
      haptic.success();
      showToast(t('admin.product.saved'), { kind: 'success' });
      goBack('/admin/products');
    } catch (e) {
      haptic.warning();
      showToast(classifyError(e) === 'permission' ? t('admin.product.conflict') : t('common.error'), { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };

  const remove = () => existing && Alert.alert(t('common.delete'), t('admin.product.deleteConfirm'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.delete'), style: 'destructive', onPress: async () => {
      try { await deleteProduct(existing); showToast(t('admin.product.deleted'), { kind: 'success' }); goBack('/admin/products'); } catch { showToast(t('common.error'), { kind: 'error' }); }
    } },
  ]);

  return (
    <View style={styles.root}>
      <Header title={existing ? t('admin.product.title') : t('admin.product.new')}
        right={existing ? <IconButton icon="trash-outline" label={t('common.delete')} onPress={remove} size={40} bg={colors.saleSoft} color={colors.sale} /> : undefined} />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]} keyboardShouldPersistTaps="handled">
          <Card style={styles.gap}>
            <Txt variant="label">{t('admin.product.images')}</Txt>
            <Animated.View layout={LinearTransition} style={styles.images}>
              {form.rasmlar.map((u, i) => (
                <Animated.View key={u} entering={ZoomIn} exiting={ZoomOut} style={styles.imageBox}>
                  <ProductImage uri={u} kategoriya={form.kategoriya} seed={u} style={styles.image} />
                  <IconButton icon="close" label={t('common.delete')} size={26} bg="rgba(15,35,56,0.75)" color={colors.white} iconSize={15}
                    style={styles.imageDel} onPress={() => set({ rasmlar: form.rasmlar.filter((_, j) => j !== i) })} />
                  {i === 0 ? <View style={styles.mainTag}><Txt variant="tiny" color={colors.white}>1</Txt></View> : null}
                </Animated.View>
              ))}
              {!form.rasmlar.length ? <ProductImage kategoriya={form.kategoriya} seed="new" style={styles.image} /> : null}
            </Animated.View>
            <Button title={uploading ? t('admin.product.uploading') : t('admin.product.upload')} icon="images-outline" variant="secondary" loading={uploading} onPress={pick} />
            {!canUpload ? <Txt variant="tiny">{t('admin.product.uploadOff')}</Txt> : null}
            <View style={styles.urlRow}>
              <View style={styles.flex}><Field placeholder={t('admin.product.imageUrl')} value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url" error={err('rasmlar')} /></View>
              <IconButton icon="add" label={t('admin.product.addUrl')} size={50} bg={colors.primary} color={colors.white}
                onPress={() => { if (/^https:\/\/\S+$/.test(url.trim())) { set({ rasmlar: [...form.rasmlar, url.trim()].slice(0, 10) }); setUrl(''); } else showToast(t('admin.product.err.url'), { kind: 'error' }); }} />
            </View>
          </Card>

          <Card style={styles.gap}>
            <Field label={t('admin.product.name')} value={form.nomi} onChangeText={(v) => set({ nomi: v })} error={err('nomi')} maxLength={160} />
            <Txt variant="label">{t('admin.product.category')}</Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {categories.map((c) => <Chip key={c} label={categoryLabel(c, lang)} selected={form.kategoriya === c} onPress={() => set({ kategoriya: c })} />)}
            </ScrollView>
            <View style={styles.two}>
              <View style={styles.flex}><Field label={t('admin.product.price')} value={form.narxi} onChangeText={(v) => set({ narxi: v.replace(/\D/g, '') })} keyboardType="number-pad" error={err('narxi')} hint={form.narxi ? money(Number(form.narxi)) : undefined} /></View>
              <View style={styles.flex}><Field label={t('admin.product.stock')} value={form.qoldiq} onChangeText={(v) => set({ qoldiq: v.replace(/\D/g, '') })} keyboardType="number-pad" error={err('qoldiq')} /></View>
            </View>
            <Field label={t('admin.product.oldPrice')} value={form.eskiNarx} onChangeText={(v) => set({ eskiNarx: v.replace(/\D/g, '') })} keyboardType="number-pad" error={err('eskiNarx')} />
            <Txt variant="label">{t('admin.product.unit')}</Txt>
            <View style={styles.wrap}>
              {UNITS.map((u) => <Chip key={u} label={u} selected={(form.birlik || 'dona') === u} onPress={() => set({ birlik: u === 'dona' ? '' : u })} />)}
            </View>
          </Card>

          <Card style={styles.gap}>
            <Field label={t('admin.product.article')} value={form.artikul} onChangeText={(v) => set({ artikul: v })} autoCapitalize="characters" maxLength={80} />
            <Field label={t('admin.product.brand')} value={form.brend} onChangeText={(v) => set({ brend: v })} maxLength={60} placeholder="GM, Valeo, Bosch…" />
            <Field label={t('admin.product.models')} value={form.model} onChangeText={(v) => set({ model: v })} hint={t('admin.product.modelsHint')} maxLength={300} />
            <View style={styles.wrap}>
              {['Universal', ...CAR_MODELS.map((m) => m.name)].map((n) => <Chip key={n} label={n} selected={hasModel(n)} onPress={() => toggleModel(n)} />)}
            </View>
            <Field label={t('admin.product.description')} value={form.tavsif} onChangeText={(v) => set({ tavsif: v })} multiline maxLength={5000} />
          </Card>

          <Card style={styles.gapSm}>
            <SwitchRow title={t('admin.product.popular')} value={form.ommabop} onChange={(v) => set({ ommabop: v })} />
            <SwitchRow title={t('admin.product.isNew')} value={form.yangi} onChange={(v) => set({ yangi: v })} />
            <Field label={t('admin.product.order')} value={form.tartib} onChangeText={(v) => set({ tartib: v.replace(/\D/g, '') })} keyboardType="number-pad" />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <Animated.View entering={FadeIn} style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Button title={t('common.save')} size="lg" loading={busy} onPress={save} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  gap: { gap: 12 },
  gapSm: { gap: 4 },
  images: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imageBox: { width: 88, height: 88 },
  image: { width: 88, height: 88, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  imageDel: { position: 'absolute', top: 4, right: 4 },
  mainTag: { position: 'absolute', left: 4, bottom: 4, backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 6 },
  urlRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  chips: { gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  two: { flexDirection: 'row', gap: 10 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 12, backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
