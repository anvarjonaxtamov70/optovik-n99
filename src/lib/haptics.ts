import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

export const haptic = {
  tap: () => { if (enabled) void Haptics.selectionAsync().catch(() => {}); },
  light: () => { if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); },
  medium: () => { if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {}); },
  success: () => { if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); },
  warning: () => { if (enabled) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}); },
};
