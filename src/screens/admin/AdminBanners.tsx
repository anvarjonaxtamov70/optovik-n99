import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { KeyboardAvoidingView, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAdminShell } from '../../components/admin/AdminShell';
import { BannerCarousel } from '../../components/shop/BannerCarousel';
import { Notice } from '../../components/shop/CatalogBits';
import { BottomBar, barButton } from '../../components/ui/BottomBar';
import { Button } from '../../components/ui/Button';
import { Card, Chip, Pill, SwitchRow } from '../../components/ui/Controls';
import { Field } from '../../components/ui/Field';
import { goBack, Header } from '../../components/ui/Header';
import { IconButton } from '../../components/ui/IconButton';
import { PressableScale } from '../../components/ui/PressableScale';
import { Txt } from '../../components/ui/Txt';
import { BANNER_THEMES, DEFAULT_BANNERS, isSafeLink, type Banner } from '../../domain/content';
import { CATEGORIES, CAR_MODELS } from '../../domain/taxonomy';
import { useT, type TKey } from '../../i18n';
import { confirmAsync } from '../../lib/confirm';
import { haptic } from '../../lib/haptics';
import { deleteBanner, saveBanner, loadCandidateAdminBanners } from '../../state/admin';
import { usesFirestoreCandidate } from '../../lib/orderBackend';
import { useUid } from '../../state/account';
import { useBanners } from '../../state/catalog';
import { showToast } from '../../state/toast';
import { colors, layout, radius, shadow } from '../../theme/tokens';

function useAdminBannerSource(){
 const legacy=useBanners();
 const uid=useUid();
 const [state,setState]=useState<{uid:string;items:Banner[]}|null>(null);
 useFocusEffect(useCallback(()=>{
  if(!usesFirestoreCandidate||!uid)return;
  let active=true;
  void loadCandidateAdminBanners(uid).then(items=>{if(active)setState({uid,items});}).catch(()=>{if(active)setState(null);});
  return ()=>{active=false;};
 },[uid]));
 return usesFirestoreCandidate?(state?.uid===uid?state?.items??null:null):legacy;
}

export function AdminBannerList() {
  const insets = useSafeAreaInsets();
  const { t, lang } = useT();
  const { sidebar } = useAdminShell();
  const { width } = useWindowDimensions();
  const wide = width >= layout.wide;
  const remote = useAdminBannerSource();
  const list = remote ?? [];
  const add = () => router.push('/admin/banner');
  return (
    <View style={styles.root}>
      <Header title={t('admin.banners')} back={!sidebar}
        right={wide ? <Button title={t('admin.banner.new')} icon="add" size="sm" full={false} onPress={add} /> : undefined} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + (wide ? 30 : 100) }]}>
        {!list.length ? <Notice icon="images-outline" text={t('admin.banner.defaults')} /> : null}
        <View style={styles.preview}><BannerCarousel banners={list.length ? list : DEFAULT_BANNERS} /></View>
        {list.map((b) => (
          <PressableScale key={b.id} onPress={() => router.push({ pathname: '/admin/banner', params: { id: b.id } })} scaleTo={0.98} style={[styles.row, shadow.soft]} accessibilityLabel={b.title[lang]}>
            <View style={styles.flex}>
              <Txt variant="bodyStrong" numberOfLines={1}>{b.title[lang].replace(/\n/g, ' ')}</Txt>
              <Txt variant="tiny">{b.link} · #{b.order}</Txt>
            </View>
            <Pill text={t(`admin.banner.theme.${b.theme}` as TKey)} tone="tint" />
          </PressableScale>
        ))}
      </ScrollView>
      {!wide ? (
        <View style={[styles.fab, { bottom: insets.bottom + 16 }]}>
          <Button title={t('admin.banner.new')} icon="add" size="lg" onPress={add} />
        </View>
      ) : null}
    </View>
  );
}

type Draft = Omit<Banner, 'id'>;
const empty: Draft = { title: { uz: '', ru: '' }, text: { uz: '', ru: '' }, cta: { uz: 'Ko‘rish', ru: 'Смотреть' }, link: 'sale', theme: 'brand', art: 'sale', order: 0, active: true };

export function AdminBannerEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const remote = useAdminBannerSource();
  const existing = remote?.find((b) => b.id === id);
  if(usesFirestoreCandidate&&id&&!existing)return <View style={styles.root}><Header title="Banner"/><Txt>Banner unavailable / Banner mavjud emas</Txt></View>;
  return <BannerEditor key={existing?.id ?? 'new'} id={existing?.id} initial={existing ?? { ...empty, order: (remote?.length ?? 0) }} />;
}

function BannerEditor({ id, initial }: { id?: string; initial: Draft }) {
  const insets = useSafeAreaInsets();
  const { t, lang } = useT();
  const { width } = useWindowDimensions();
  const wide = width >= layout.wide;
  const [d, setD] = useState<Draft>(initial);
  const [busy, setBusy] = useState(false);
  const set = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));
  const links: { value: string; label: string }[] = [
    { value: 'sale', label: t('home.sale') }, { value: 'new', label: t('home.new') }, { value: 'popular', label: t('home.popular') },
    { value: 'group:parts', label: t('catalog.parts') }, { value: 'group:accessories', label: t('catalog.accessories') },
    { value: 'contact', label: t('profile.contact') }, { value: 'delivery', label: t('profile.delivery') },
    ...CATEGORIES.map((c) => ({ value: `cat:${c.slug}`, label: c.label[lang] })),
    ...CAR_MODELS.slice(0, 10).map((m) => ({ value: `model:${m.slug}`, label: m.name })),
  ];
  const valid = !!(d.title.uz.trim() || d.title.ru.trim()) && isSafeLink(d.link) && (!d.image || /^https:\/\/\S+$/.test(d.image));
  const save = async () => {
    setBusy(true);
    try {
      await saveBanner({ ...d, title: { uz: d.title.uz || d.title.ru, ru: d.title.ru || d.title.uz } }, id);
      haptic.success();
      showToast(t('admin.banner.saved'), { kind: 'success' });
      goBack('/admin/banners');
    } catch {
      showToast(t('common.error'), { kind: 'error' });
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.root}>
      <Header title={id ? t('admin.banner.title') : t('admin.banner.new')}
        right={id ? <IconButton icon="trash-outline" label={t('common.delete')} size={40} bg={colors.saleSoft} color={colors.sale}
          onPress={() => void confirmAsync(t('common.delete'), '', { ok: t('common.delete'), cancel: t('common.cancel'), destructive: true }).then((ok) => {
            if (ok) void deleteBanner(id).then(() => goBack('/admin/banners')).catch(() => showToast(t('common.error'), { kind: 'error' }));
          })} /> : undefined} />
      <KeyboardAvoidingView style={styles.root} behavior="padding">
        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 110 }]} keyboardShouldPersistTaps="handled">
          <Txt variant="label">{t('admin.banner.preview')}</Txt>
          <View style={styles.preview}><BannerCarousel banners={[{ ...d, id: 'preview', title: { uz: d.title.uz || '…', ru: d.title.ru || d.title.uz || '…' } }]} /></View>
          <Card style={styles.gap}>
            <Field label={t('admin.banner.titleUz')} value={d.title.uz} onChangeText={(v) => set({ title: { ...d.title, uz: v } })} maxLength={60} multiline />
            <Field label={t('admin.banner.titleRu')} value={d.title.ru} onChangeText={(v) => set({ title: { ...d.title, ru: v } })} maxLength={60} multiline />
            <Field label={t('admin.banner.textUz')} value={d.text.uz} onChangeText={(v) => set({ text: { ...d.text, uz: v } })} maxLength={120} />
            <Field label={t('admin.banner.textRu')} value={d.text.ru} onChangeText={(v) => set({ text: { ...d.text, ru: v } })} maxLength={120} />
            <View style={styles.two}>
              <View style={styles.flex}><Field label={t('admin.banner.ctaUz')} value={d.cta.uz} onChangeText={(v) => set({ cta: { ...d.cta, uz: v } })} maxLength={30} /></View>
              <View style={styles.flex}><Field label={t('admin.banner.ctaRu')} value={d.cta.ru} onChangeText={(v) => set({ cta: { ...d.cta, ru: v } })} maxLength={30} /></View>
            </View>
          </Card>
          <Card style={styles.gap}>
            <Txt variant="label">{t('admin.banner.link')}</Txt>
            <View style={styles.wrap}>{links.map((l) => <Chip key={l.value} label={l.label} selected={d.link === l.value} onPress={() => set({ link: l.value })} />)}</View>
            <Txt variant="label">{t('admin.banner.theme')}</Txt>
            <View style={styles.wrap}>{BANNER_THEMES.map((th) => <Chip key={th} label={t(`admin.banner.theme.${th}` as TKey)} selected={d.theme === th} onPress={() => set({ theme: th })} />)}</View>
            <Txt variant="label">{t('admin.banner.art')}</Txt>
            <View style={styles.wrap}>{(['gm', 'accessories', 'sale', 'delivery', 'cash'] as const).map((a) => <Chip key={a} label={t(`admin.banner.art.${a}` as TKey)} selected={d.art === a} onPress={() => set({ art: a })} />)}</View>
            <Field label={t('admin.banner.image')} value={d.image ?? ''} onChangeText={(v) => set({ image: v.trim() || undefined })} autoCapitalize="none" keyboardType="url" />
            <Field label={t('admin.banner.order')} value={String(d.order)} onChangeText={(v) => set({ order: parseInt(v.replace(/\D/g, '') || '0', 10) })} keyboardType="number-pad" />
            <SwitchRow title={t('admin.banner.active')} value={d.active} onChange={(v) => set({ active: v })} />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <BottomBar wide={wide}>
        <Button title={t('common.save')} size="lg" loading={busy} disabled={!valid} onPress={save} full={!wide} style={wide ? barButton : undefined} />
      </BottomBar>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  body: { padding: 16, gap: 12, width: '100%', maxWidth: 760, alignSelf: 'center' },
  preview: { marginHorizontal: -16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.lg, backgroundColor: colors.white },
  gap: { gap: 12 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  two: { flexDirection: 'row', gap: 10 },
  fab: { position: 'absolute', left: 16, right: 16 },
});
