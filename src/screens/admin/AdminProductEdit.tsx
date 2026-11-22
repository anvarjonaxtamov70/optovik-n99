import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View, type ScrollViewInstance } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ADMIN_WIDE } from '../../components/admin/AdminShell';
import { ImageManager } from '../../components/admin/ImageManager';
import { Button } from '../../components/ui/Button';
import { Card, Chip, SwitchRow } from '../../components/ui/Controls';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { goBack, Header } from '../../components/ui/Header';
import { IconButton } from '../../components/ui/IconButton';
import { Skeleton } from '../../components/ui/Skeleton';
import { Txt } from '../../components/ui/Txt';
import type { Product } from '../../domain/products';
import { CAR_MODELS, CATEGORIES, categoryLabel } from '../../domain/taxonomy';
import { useT, type TKey } from '../../i18n';
import { confirmAsync } from '../../lib/confirm';
import { classifyError } from '../../lib/firebase';
import { haptic } from '../../lib/haptics';
import { deleteProduct, formFromCopy, formFromProduct, nextNewForm, saveProduct, validateProduct, type ProductForm } from '../../state/admin';
import { useCatalogStatus, useProduct, useProducts } from '../../state/catalog';
import { showToast } from '../../state/toast';
import { colors } from '../../theme/tokens';

const UNITS = ['dona', 'komplekt', 'juft', 'litr', 'metr'];
const IS_WEB = Platform.OS === 'web';

export default function AdminProductEdit() {
  const { id, copy } = useLocalSearchParams<{ id?: string; copy?: string }>();
  const { t } = useT();
  const existing = useProduct(id ?? '');
  const source = useProduct(copy ?? '');
  const status = useCatalogStatus();
  const wanted = id || copy;
  if (wanted && !(existing ?? source)) {
    // Sahifa to'g'ridan-to'g'ri ochilganda katalog hali yuklanmagan bo'lishi mumkin — bo'sh forma ko'rsatib yuborilmaydi.
    return (
      <View style={styles.root}>
        <Header title={t('admin.product.title')} />
        {status === 'loading'
          ? <View style={styles.loading}><Skeleton height={200} radius={18} /><Skeleton height={140} radius={18} /></View>
          : <EmptyState icon="cube-outline" title={t('admin.product.notFound')} action={{ label: t('admin.products'), onPress: () => goBack('/admin/products') }} />}
      </View>
    );
  }
  const initial = existing ? formFromProduct(existing) : source ? formFromCopy(source, t('admin.product.copySuffix')) : formFromProduct();
  return <Editor key={existing?.id ?? (source ? `copy:${source.id}` : 'new')} existing={existing} initial={initial} copied={!!source && !existing} />;
}

function Editor({ existing, initial, copied }: { existing?: Product; initial: ProductForm; copied: boolean }) {
  const [form, setForm] = useState<ProductForm>(initial);
  const [baseline, setBaseline] = useState<ProductForm>(initial);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  // Shu kenglikdan boshlab forma ikki ustunga bo'linadi (noutbuk).
  const wide = width >= ADMIN_WIDE;
  const { t, lang, money } = useT();
  const products = useProducts();
  const scroll = useRef<ScrollViewInstance>(null);
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const errors = validateProduct(form);
  const err = (k: keyof ProductForm) => (touched && errors[k] ? t(`admin.product.err.${errors[k]}` as TKey) : null);
  const set = (patch: Partial<ProductForm>) => setForm((f) => ({ ...f, ...patch }));
  const setImages = useCallback((update: (list: string[]) => string[]) => setForm((f) => ({ ...f, rasmlar: update(f.rasmlar) })), []);
  const categories = Array.from(new Set([...CATEGORIES.map((c) => c.slug), ...products.map((p) => p.kategoriya)]));
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  // Saqlanmagan o'zgarish bo'lsa, orqaga qaytishda (va brauzer yopilganda) so'raymiz.
  const disablePrevention = usePreventRemove(dirty && !busy && !leaving, ({ repeat }) => {
    void confirmAsync(t('admin.product.unsavedTitle'), t('admin.product.unsavedText'), { ok: t('admin.product.leave'), cancel: t('common.cancel'), destructive: true })
      .then((ok) => { if (ok) { setLeaving(true); repeat(); } });
  });
  const allowLeave = () => { setLeaving(true); disablePrevention(); };

  const toggleModel = (name: string) => {
    const parts = form.model.split(/[,;/]+/).map((s) => s.trim()).filter(Boolean);
    const has = parts.some((p) => p.toLowerCase() === name.toLowerCase());
    set({ model: (has ? parts.filter((p) => p.toLowerCase() !== name.toLowerCase()) : [...parts, name]).join(', ') });
  };
  const hasModel = (name: string) => form.model.toLowerCase().split(/[,;/]+/).map((s) => s.trim()).includes(name.toLowerCase());

  const save = async (mode: 'close' | 'next') => {
    if (busy) return;
    setTouched(true);
    if (uploading) { showToast(t('admin.product.uploadingWait')); return; }
    if (Object.keys(errors).length) {
      haptic.warning();
      showToast(t('admin.product.checkFields'), { kind: 'error' });
      return;
    }
    setBusy(true);
    try {
      await saveProduct(form, existing);
      haptic.success();
      showToast(t('admin.product.saved'), { kind: 'success' });
      if (mode === 'next') {
        const next = nextNewForm(form);
        setForm(next);
        setBaseline(next);
        setTouched(false);
        scroll.current?.scrollTo({ y: 0, animated: true });
      } else {
        allowLeave();
        goBack('/admin/products');
      }
    } catch (e) {
      haptic.warning();
      showToast(classifyError(e) === 'permission' ? t('admin.product.conflict') : t('common.error'), { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };
  const onShortcut = useEffectEvent(() => { void save('close'); });

  // Brauzer: Ctrl+S (Mac'da Cmd+S) — saqlash. `capture`: react-native-web TextInput tugma hodisalarini yuqoriga o'tkazmaydi.
  useEffect(() => {
    if (!IS_WEB || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); onShortcut(); }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const remove = async () => {
    if (!existing) return;
    const ok = await confirmAsync(t('common.delete'), t('admin.product.deleteConfirm'), { ok: t('common.delete'), cancel: t('common.cancel'), destructive: true });
    if (!ok) return;
    try {
      await deleteProduct(existing);
      showToast(t('admin.product.deleted'), { kind: 'success' });
      allowLeave();
      goBack('/admin/products');
    } catch {
      showToast(t('common.error'), { kind: 'error' });
    }
  };

  const duplicate = async () => {
    if (!existing) return;
    if (dirty) {
      const ok = await confirmAsync(t('admin.product.unsavedTitle'), t('admin.product.unsavedText'), { ok: t('admin.product.duplicate'), cancel: t('common.cancel') });
      if (!ok) return;
    }
    allowLeave();
    router.replace({ pathname: '/admin/product', params: { copy: existing.id } });
  };

  const images = (
    <Card style={styles.gap}>
      <ImageManager images={form.rasmlar} onChange={setImages} kategoriya={form.kategoriya} error={err('rasmlar')} onBusyChange={setUploading} />
    </Card>
  );
  const main = (
    <Card style={styles.gap}>
      <Field label={t('admin.product.name')} value={form.nomi} onChangeText={(v) => set({ nomi: v })} error={err('nomi')} maxLength={160} autoFocus={IS_WEB && !existing} />
      <Txt variant="label">{t('admin.product.category')}</Txt>
      {wide ? (
        <View style={styles.wrap}>
          {categories.map((c) => <Chip key={c} label={categoryLabel(c, lang)} selected={form.kategoriya === c} onPress={() => set({ kategoriya: c })} />)}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {categories.map((c) => <Chip key={c} label={categoryLabel(c, lang)} selected={form.kategoriya === c} onPress={() => set({ kategoriya: c })} />)}
        </ScrollView>
      )}
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
  );
  const details = (
    <Card style={styles.gap}>
      <Field label={t('admin.product.article')} value={form.artikul} onChangeText={(v) => set({ artikul: v })} autoCapitalize="characters" maxLength={80} />
      <Field label={t('admin.product.brand')} value={form.brend} onChangeText={(v) => set({ brend: v })} maxLength={60} placeholder="GM, Valeo, Bosch…" />
      <Field label={t('admin.product.models')} value={form.model} onChangeText={(v) => set({ model: v })} hint={t('admin.product.modelsHint')} maxLength={300} />
      <View style={styles.wrap}>
        {['Universal', ...CAR_MODELS.map((m) => m.name)].map((n) => <Chip key={n} label={n} selected={hasModel(n)} onPress={() => toggleModel(n)} />)}
      </View>
      <Field label={t('admin.product.description')} value={form.tavsif} onChangeText={(v) => set({ tavsif: v })} multiline maxLength={5000} />
    </Card>
  );
  const flags = (
    <Card style={styles.gapSm}>
      <SwitchRow title={t('admin.product.popular')} value={form.ommabop} onChange={(v) => set({ ommabop: v })} />
      <SwitchRow title={t('admin.product.isNew')} value={form.yangi} onChange={(v) => set({ yangi: v })} />
      <Field label={t('admin.product.order')} value={form.tartib} onChangeText={(v) => set({ tartib: v.replace(/\D/g, '') })} keyboardType="number-pad" />
    </Card>
  );

  const title = existing ? t('admin.product.title') : copied ? t('admin.product.copy') : t('admin.product.new');
  const stacked = !existing && !wide;
  return (
    <View style={styles.root}>
      <Header title={title} subtitle={existing?.nomi}
        right={existing ? (
          <>
            <IconButton icon="copy-outline" label={t('admin.product.duplicate')} onPress={() => void duplicate()} size={40} bg={colors.tint} color={colors.primary} />
            <IconButton icon="trash-outline" label={t('common.delete')} onPress={() => void remove()} size={40} bg={colors.saleSoft} color={colors.sale} />
          </>
        ) : undefined} />
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} contentContainerStyle={[styles.body, wide && styles.bodyWide, { paddingBottom: insets.bottom + (stacked ? 170 : 110) }]} keyboardShouldPersistTaps="handled">
          {wide ? (
            <View style={styles.columns}>
              <Column>{images}{main}</Column>
              <Column>{details}{flags}</Column>
            </View>
          ) : (
            <>{images}{main}{details}{flags}</>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <View style={[styles.barInner, wide && styles.barWide, stacked && styles.barStacked]}>
          {IS_WEB && wide ? <Txt variant="tiny" style={styles.flex}>{t('admin.product.shortcut')}</Txt> : null}
          {!existing ? (
            <Button title={t('admin.product.saveAndNew')} icon="add-circle-outline" variant="secondary" size={wide ? 'lg' : 'md'} full={!wide}
              disabled={busy} onPress={() => void save('next')} style={wide ? styles.barBtn : undefined} />
          ) : null}
          <Button title={t('common.save')} size="lg" loading={busy} full={!wide} onPress={() => void save('close')} style={wide ? styles.barBtn : undefined} />
        </View>
      </View>
    </View>
  );
}

function Column({ children }: { children: ReactNode }) {
  return <View style={styles.column}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  loading: { padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  body: { padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  bodyWide: { maxWidth: 1240, padding: 24 },
  columns: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
  column: { flex: 1, gap: 16, minWidth: 0 },
  gap: { gap: 12 },
  gapSm: { gap: 4 },
  chips: { gap: 8, paddingVertical: 4 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  two: { flexDirection: 'row', gap: 10 },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 12, backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  barInner: { width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', gap: 10 },
  barStacked: { flexDirection: 'column' },
  barWide: { maxWidth: 1240, paddingHorizontal: 8, alignItems: 'center', justifyContent: 'flex-end' },
  barBtn: { minWidth: 220 },
});
