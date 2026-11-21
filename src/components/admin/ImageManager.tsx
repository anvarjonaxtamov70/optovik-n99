import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, LinearTransition, ZoomIn, ZoomOut } from 'react-native-reanimated';

import { addImages, MAX_IMAGES, moveImage } from '../../domain/products';
import { useT, type TKey } from '../../i18n';
import { haptic } from '../../lib/haptics';
import { UploadError, uploadToImgbb, useMediaKey } from '../../state/admin';
import { showToast } from '../../state/toast';
import { colors, radius } from '../../theme/tokens';
import { ProductImage } from '../shop/ProductImage';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { PressableScale } from '../ui/PressableScale';
import { Txt } from '../ui/Txt';

type Source = { data: Blob | string; preview: string; revoke?: boolean };
type Pending = { id: number; preview: string };

const IS_WEB = Platform.OS === 'web';
const ERROR_TEXT: Record<UploadError['kind'], TKey> = {
  badKey: 'admin.product.uploadBadKey', tooBig: 'admin.product.uploadTooBig', network: 'admin.product.uploadNetwork', server: 'admin.product.uploadFailed',
};

/**
 * Tovar rasmlari: bir nechtasini birdan tanlash, brauzerda sudrab tashlash va Ctrl+V,
 * tartibni o'zgartirish (1-rasm — asosiy), havola orqali qo'shish.
 */
export function ImageManager({ images, onChange, kategoriya, error, onBusyChange }: {
  images: string[];
  onChange: (update: (list: string[]) => string[]) => void;
  kategoriya: string;
  error?: string | null;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { t } = useT();
  const media = useMediaKey();
  const [pending, setPending] = useState<Pending[]>([]);
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const seq = useRef(0);
  /** Hozir yuklanayotgan rasmlar soni — ketma-ket tashlanganda limitni to'g'ri hisoblash uchun. */
  const inflight = useRef(0);
  const full = images.length + pending.length >= MAX_IMAGES;
  const roomNow = () => MAX_IMAGES - images.length - inflight.current;

  useEffect(() => { onBusyChange?.(pending.length > 0); }, [pending.length, onBusyChange]);

  const upload = async (sources: Source[]) => {
    if (!sources.length) return;
    if (!media.key) { showToast(t('admin.product.uploadOff'), { kind: 'error' }); return; }
    const room = roomNow();
    if (room <= 0 || sources.length > room) showToast(t('admin.product.imagesLimit', { n: MAX_IMAGES }), { kind: room <= 0 ? 'error' : 'info' });
    const batch = sources.slice(0, Math.max(0, room)).map((s) => ({ ...s, id: ++seq.current }));
    if (!batch.length) return;
    inflight.current += batch.length;
    setPending((p) => [...p, ...batch.map(({ id, preview }) => ({ id, preview }))]);
    let done = 0;
    let failure: UploadError | null = null;
    // Ketma-ket yuklaymiz: sekin internetda ham tartib saqlanadi va ImgBB cheklovlariga tushmaymiz.
    for (const item of batch) {
      try {
        const link = await uploadToImgbb(item.data, media.key);
        onChange((list) => addImages(list, [link]));
        done += 1;
      } catch (e) {
        failure = e instanceof UploadError ? e : new UploadError('server', String(e));
      } finally {
        inflight.current -= 1;
        setPending((p) => p.filter((x) => x.id !== item.id));
        // Yopilish animatsiyasi tugaguncha ko'rinish uchun biroz kutib bo'shatamiz.
        if (item.revoke) setTimeout(() => URL.revokeObjectURL(item.preview), 2000);
      }
    }
    if (failure) {
      haptic.warning();
      showToast(t(ERROR_TEXT[failure.kind], { msg: failure.message }), { kind: 'error', duration: 4000 });
    } else {
      haptic.success();
      showToast(t('admin.product.uploaded', { n: done }), { kind: 'success' });
    }
  };
  const uploadFiles = useEffectEvent((sources: Source[]) => { void upload(sources); });

  // Brauzer: butun sahifaga rasm tashlash va Ctrl+V bilan qo'yish.
  useEffect(() => {
    if (!IS_WEB || typeof window === 'undefined') return;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files');
    const toSources = (list: FileList | null | undefined): Source[] => Array.from(list ?? [])
      .filter((f) => f.type.startsWith('image/'))
      .map((f) => ({ data: f, preview: URL.createObjectURL(f), revoke: true }));
    let depth = 0;
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth += 1; setDragging(true); } };
    const leave = (e: DragEvent) => { if (hasFiles(e)) { depth = Math.max(0, depth - 1); if (!depth) setDragging(false); } };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // aks holda brauzer rasmni ochib, forma yo'qoladi
      depth = 0;
      setDragging(false);
      uploadFiles(toSources(e.dataTransfer?.files));
    };
    const paste = (e: ClipboardEvent) => {
      const sources = toSources(e.clipboardData?.files);
      if (sources.length) { e.preventDefault(); uploadFiles(sources); }
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragleave', leave);
    window.addEventListener('dragover', over);
    window.addEventListener('drop', drop);
    window.addEventListener('paste', paste, true);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('dragover', over);
      window.removeEventListener('drop', drop);
      window.removeEventListener('paste', paste, true);
    };
  }, []);

  const pick = async () => {
    if (!media.key) { showToast(t('admin.product.uploadOff'), { kind: 'error' }); return; }
    const room = roomNow();
    if (room <= 0) { showToast(t('admin.product.imagesLimit', { n: MAX_IMAGES }), { kind: 'error' }); return; }
    if (!IS_WEB) {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { showToast(t('admin.product.uploadPermissionText'), { kind: 'error', duration: 4000 }); return; }
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.8, allowsMultipleSelection: true, selectionLimit: room, base64: !IS_WEB,
    });
    if (res.canceled) return;
    const sources = await Promise.all(res.assets.map(async (a): Promise<Source | null> => {
      if (IS_WEB) return { data: a.file ?? (await (await fetch(a.uri)).blob()), preview: a.uri };
      return a.base64 ? { data: a.base64, preview: a.uri } : null;
    }));
    void upload(sources.filter((s): s is Source => !!s));
  };

  const addUrl = () => {
    const u = url.trim();
    if (!/^https:\/\/\S+$/.test(u)) { showToast(t('admin.product.err.url'), { kind: 'error' }); return; }
    if (full) { showToast(t('admin.product.imagesLimit', { n: MAX_IMAGES }), { kind: 'error' }); return; }
    onChange((list) => addImages(list, [u]));
    setUrl('');
  };

  return (
    <View style={[styles.wrap, dragging && styles.dragging]}>
      <View style={styles.titleRow}>
        <Txt variant="label">{t('admin.product.images')}</Txt>
        <Txt variant="tiny">{images.length}/{MAX_IMAGES}</Txt>
      </View>
      <Animated.View layout={LinearTransition} style={styles.grid}>
        {images.map((u, i) => (
          <Animated.View key={u} entering={ZoomIn} exiting={ZoomOut} layout={LinearTransition} style={styles.tile}>
            <ProductImage uri={u} kategoriya={kategoriya} seed={u} style={styles.image} />
            <IconButton icon="close" label={t('common.delete')} size={28} bg={colors.overlay} color={colors.white} iconSize={16}
              style={styles.del} onPress={() => onChange((list) => list.filter((x) => x !== u))} />
            {i === 0 ? <View style={styles.main}><Txt variant="tiny" color={colors.white}>{t('admin.product.mainImage')}</Txt></View> : null}
            {images.length > 1 ? (
              <View style={styles.moves}>
                {i > 0 ? <IconButton icon="chevron-back" label={t('admin.product.moveLeft')} size={28} bg={colors.white} color={colors.ink} iconSize={16}
                  onPress={() => onChange((list) => moveImage(list, list.indexOf(u), list.indexOf(u) - 1))} /> : <View />}
                {i < images.length - 1 ? <IconButton icon="chevron-forward" label={t('admin.product.moveRight')} size={28} bg={colors.white} color={colors.ink} iconSize={16}
                  onPress={() => onChange((list) => moveImage(list, list.indexOf(u), list.indexOf(u) + 1))} /> : null}
              </View>
            ) : null}
          </Animated.View>
        ))}
        {pending.map((p) => (
          <Animated.View key={`p${p.id}`} entering={FadeIn} exiting={ZoomOut} style={styles.tile}>
            <Image source={{ uri: p.preview }} style={styles.image} contentFit="cover" />
            <View style={styles.busy}><ActivityIndicator color={colors.white} /></View>
          </Animated.View>
        ))}
        {!full ? (
          <PressableScale onPress={() => void pick()} style={[styles.tile, styles.add]} accessibilityLabel={t('admin.product.upload')} scaleTo={0.95}>
            <Icon name="add" size={28} color={colors.primary} />
            <Txt variant="tiny" color={colors.primary} center>{t('admin.product.upload')}</Txt>
          </PressableScale>
        ) : null}
      </Animated.View>

      {dragging ? (
        <View style={styles.dropBanner}><Icon name="cloud-upload-outline" size={20} color={colors.primary} /><Txt variant="smallStrong" color={colors.primary}>{t('admin.product.dropHere')}</Txt></View>
      ) : IS_WEB && media.key ? <Txt variant="tiny">{t('admin.product.dropHint')}</Txt> : null}

      {media.ready && !media.key ? (
        <View style={styles.off}>
          <Txt variant="small" style={styles.flex}>{t('admin.product.uploadOff')}</Txt>
          <Button title={t('admin.product.openSettings')} size="sm" variant="secondary" full={false} onPress={() => router.push('/admin/settings')} />
        </View>
      ) : null}

      <View style={styles.urlRow}>
        <View style={styles.flex}>
          <Field placeholder={t('admin.product.imageUrl')} value={url} onChangeText={setUrl} autoCapitalize="none" keyboardType="url"
            onSubmitEditing={addUrl} returnKeyType="done" error={error} />
        </View>
        <IconButton icon="link" label={t('admin.product.addUrl')} size={52} bg={colors.tint} color={colors.primary} onPress={addUrl} />
      </View>
    </View>
  );
}

const TILE = 104;
const styles = StyleSheet.create({
  wrap: { gap: 12, borderRadius: radius.md, borderWidth: 2, borderColor: 'transparent', borderStyle: 'dashed', margin: -6, padding: 4 },
  dragging: { borderColor: colors.primary, backgroundColor: colors.tint },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: TILE, height: TILE },
  image: { width: TILE, height: TILE, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  del: { position: 'absolute', top: 4, right: 4 },
  main: { position: 'absolute', left: 4, top: 4, backgroundColor: colors.primary, borderRadius: radius.xs, paddingHorizontal: 6, paddingVertical: 1 },
  moves: { position: 'absolute', left: 4, right: 4, bottom: 4, flexDirection: 'row', justifyContent: 'space-between' },
  busy: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: radius.md, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  add: { borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.tintStrong, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', gap: 2, padding: 6 },
  dropBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 8 },
  off: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: radius.sm, backgroundColor: colors.warningSoft },
  urlRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
});
