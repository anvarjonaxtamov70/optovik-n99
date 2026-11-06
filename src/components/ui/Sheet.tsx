import { useEffect, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, radius } from '../../theme/tokens';
import { IconButton } from './IconButton';
import { Txt } from './Txt';

/** Pastdan chiqadigan oyna: fon xiralashadi, oyna prujina bilan ko'tariladi. */
export function Sheet({ visible, onClose, title, children, footer, closeLabel = 'Close' }: {
  visible: boolean; onClose: () => void; title?: string; children: ReactNode; footer?: ReactNode; closeLabel?: string;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      progress.value = withSpring(1, { damping: 22, stiffness: 240, mass: 0.8 });
    } else if (mounted) {
      progress.value = withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }, (done) => {
        if (done) scheduleOnRN(setMounted, false);
      });
    }
  }, [visible, mounted, progress]);

  const backdrop = useAnimatedStyle(() => ({ opacity: progress.value }));
  const panel = useAnimatedStyle(() => ({ transform: [{ translateY: (1 - progress.value) * height * 0.6 }] }));

  if (!mounted) return null;
  return (
    <Modal transparent visible statusBarTranslucent navigationBarTranslucent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={closeLabel} />
        </Animated.View>
        <Animated.View style={[styles.panel, { maxHeight: height * 0.88, paddingBottom: Math.max(insets.bottom, 16) }, panel]}>
          <View style={styles.grabber} />
          {title ? (
            <View style={styles.header}>
              <Txt variant="h2" style={styles.title}>{title}</Txt>
              <IconButton icon="close" label={closeLabel} onPress={onClose} size={36} bg={colors.surfaceAlt} />
            </View>
          ) : null}
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>{children}</ScrollView>
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: colors.overlay },
  panel: { backgroundColor: colors.white, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, width: '100%', maxWidth: 760, alignSelf: 'center' },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.lineStrong, marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 6, gap: 12 },
  title: { flex: 1 },
  body: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 8 },
});
