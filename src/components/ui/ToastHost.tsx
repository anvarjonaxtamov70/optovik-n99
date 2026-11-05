import { StyleSheet, View } from 'react-native';
import Animated, { FadeOutDown, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hideToast, useToast } from '../../state/toast';
import { colors, radius, shadow } from '../../theme/tokens';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

/** Pastki menyu ustida chiqadigan qisqa xabar. */
export function ToastHost({ bottomOffset = 76 }: { bottomOffset?: number }) {
  const toast = useToast();
  const insets = useSafeAreaInsets();
  if (!toast) return null;
  const icon: IconName = (toast.icon as IconName) ?? (toast.kind === 'success' ? 'checkmark-circle' : toast.kind === 'error' ? 'alert-circle' : 'information-circle');
  const iconColor = toast.kind === 'error' ? '#FF8A8A' : toast.kind === 'success' ? '#7EE2B0' : colors.sky;
  return (
    <View pointerEvents="box-none" style={[styles.host, { bottom: insets.bottom + bottomOffset }]}>
      <Animated.View key={toast.id} entering={SlideInDown.springify().damping(18).stiffness(220)} exiting={FadeOutDown.duration(160)} style={[styles.toast, shadow.float]}>
        <Icon name={icon} size={22} color={iconColor} />
        <Txt variant="smallStrong" color={colors.white} style={styles.msg} numberOfLines={2} accessibilityLiveRegion="polite">{toast.message}</Txt>
        {toast.action ? (
          <PressableScale onPress={() => { toast.action?.onPress(); hideToast(); }} style={styles.action} accessibilityLabel={toast.action.label}>
            <Txt variant="smallStrong" color={colors.sky}>{toast.action.label}</Txt>
          </PressableScale>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12, alignItems: 'center', zIndex: 1000 },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#13283E', borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, width: '100%', maxWidth: 560 },
  msg: { flex: 1 },
  action: { paddingHorizontal: 8, paddingVertical: 6 },
});
