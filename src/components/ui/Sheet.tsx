import { useEffect, useState, type ReactNode } from 'react';
import { BackHandler, KeyboardAvoidingView, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { tNow } from '../../i18n';
import { useKeyboard } from '../../state/keyboard';
import { colors, fill, radius } from '../../theme/tokens';
import { FormScroll } from './FormScroll';
import { IconButton } from './IconButton';
import { Portal } from './Portal';
import { Txt } from './Txt';

/**
 * Pastdan chiqadigan oyna: fon xiralashadi, oyna prujina bilan ko'tariladi.
 * Ilova ildizidagi qatlamda chiziladi (`Modal` emas) — Android'da ham klaviatura ochilganda oyna
 * klaviatura ustiga ko'tariladi va yozilayotgan maydon ko'rinib turadi.
 */
export function Sheet({ visible, onClose, title, children, footer, closeLabel }: {
  visible: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode; closeLabel?: string;
}) {
  const close = closeLabel ?? tNow('common.close');
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const kb = useKeyboard();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.set(withSpring(1, { damping: 22, stiffness: 240, mass: 0.8 }));
    } else if (mounted) {
      progress.set(withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      }));
    }
  }, [visible, mounted, progress]);

  // Android «orqaga» tugmasi oynani yopadi (Modal buni o'zi qilardi).
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [visible, onClose]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * height * 0.6 }] }));

  if (!mounted) return null;
  // Klaviatura ochiq bo'lsa, oyna qolgan joyga sig'adi (sarlavha ekran tepasidan chiqib ketmaydi).
  const maxHeight = kb.visible ? Math.max(240, height - kb.height - insets.top - 12) : height * 0.88;
  return (
    <Portal>
      <View style={styles.layer} accessibilityViewIsModal>
        <KeyboardAvoidingView behavior="padding" style={styles.root}>
          <Animated.View style={[fill, styles.backdrop, backdrop]}>
            <Pressable style={fill} onPress={onClose} accessibilityLabel={close} />
          </Animated.View>
          <Animated.View style={[styles.panel, { maxHeight, paddingBottom: kb.visible ? 12 : Math.max(insets.bottom, 16) }, panel]}>
            <View style={styles.grabber} />
            {title ? (
              <View style={styles.header}>
                <Txt variant="h2" style={styles.title}>{title}</Txt>
                <IconButton icon="close" label={close} onPress={onClose} size={44} bg={colors.surfaceAlt} />
              </View>
            ) : null}
            <FormScroll avoid={false} bounces={false} contentContainerStyle={styles.body}>{children}</FormScroll>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Portal>
  );
}

const styles = StyleSheet.create({
  layer: { ...fill, zIndex: 100 },
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.overlay },
  panel: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, width: '100%', maxWidth: 760, alignSelf: 'center' },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.lineStrong, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, gap: 12 },
  title: { flex: 1 },
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
