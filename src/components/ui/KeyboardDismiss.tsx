import { useEffect, useState } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useT } from '../../i18n';
import { haptic } from '../../lib/haptics';
import { useKeyboard } from '../../state/keyboard';
import { colors, radius, shadow } from '../../theme/tokens';
import { GlassFill } from './Glass';
import { PartIcon } from './Icon';
import { PressableScale, PressOverlay } from './PressableScale';
import { Txt } from './Txt';

/** Tugma va klaviatura orasidagi masofa. */
const GAP = 8;
/** Tugma balandligi — formalar yozilayotgan maydonni shu tugmadan ham yuqoriroqqa suradi. */
export const KEYBOARD_BUTTON_SPACE = 36 + GAP * 2;

/**
 * Klaviatura ustidagi kichik «Yopish» tugmasi — ilovaning hamma joyida (raqam klaviaturasida
 * «Tayyor» tugmasi yo'q, foydalanuvchi klaviaturani yopa olmay qolardi).
 * iOS da klaviatura bilan birga ko'tariladi, Android da klaviatura chiqqach paydo bo'ladi.
 * Ilova ildizida va pastdan chiqadigan oyna (Sheet) ichida turadi.
 */
export function KeyboardDismiss() {
  const kb = useKeyboard();
  const { t } = useT();
  const [rootH, setRootH] = useState(0);
  const [mounted, setMounted] = useState(false);
  const shift = useSharedValue(40);
  const shown = useSharedValue(0);
  if (kb.visible && !mounted) setMounted(true);

  useEffect(() => {
    const ease = Easing.out(Easing.cubic);
    if (kb.visible) {
      // iOS: klaviatura balandligidan boshlab u bilan bir vaqtda ko'tariladi.
      shift.set(Platform.OS === 'ios' ? kb.height * 0.6 : 10);
      shift.set(withTiming(0, { duration: Platform.OS === 'ios' ? kb.duration : 160, easing: ease }));
      shown.set(withTiming(1, { duration: Platform.OS === 'ios' ? Math.min(kb.duration, 200) : 140 }));
    } else if (mounted) {
      shown.set(withTiming(0, { duration: 120 }, (done) => { if (done) scheduleOnRN(setMounted, false); }));
      shift.set(withTiming(24, { duration: 160, easing: ease }));
    }
  }, [kb.visible, kb.height, kb.duration, mounted, shift, shown]);

  const style = useAnimatedStyle(() => ({ opacity: shown.value, transform: [{ translateY: shift.value }] }));
  if (Platform.OS === 'web') return null;
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill} onLayout={(e) => setRootH(e.nativeEvent.layout.height)}>
      {mounted && rootH > 0 ? (
        <Animated.View style={[styles.wrap, { bottom: Math.max(GAP, rootH - kb.top + GAP) }, style]}>
          <PressableScale onPress={() => { haptic.tap(); Keyboard.dismiss(); }} scaleTo={0.92} hitSlop={8} unstable_pressDelay={0}
            accessibilityLabel={t('common.hideKeyboard')} style={[styles.btn, shadow.soft]}>
            <GlassFill tone="light" radius={radius.pill} />
            <PressOverlay color={colors.primary} max={0.1} radius={radius.pill} />
            <PartIcon name="keyboard-close" size={20} color={colors.primary} />
            <Txt variant="smallStrong" color={colors.ink}>{t('common.close')}</Txt>
          </PressableScale>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 10 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 36, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.white },
});
