import { Alert, Platform } from 'react-native';

/**
 * "Rostdan ham…?" so'rovi. Telefonda — Alert, brauzerda — window.confirm
 * (react-native-web'da Alert.alert hech narsa ko'rsatmaydi).
 */
export function confirmAsync(title: string, message: string, buttons: { ok: string; cancel: string; destructive?: boolean }): Promise<boolean> {
  if (Platform.OS === 'web') {
    const text = [title, message].filter(Boolean).join('\n\n');
    return Promise.resolve(typeof globalThis.confirm === 'function' ? globalThis.confirm(text) : false);
  }
  return new Promise((resolve) => {
    Alert.alert(title, message || undefined, [
      { text: buttons.cancel, style: 'cancel', onPress: () => resolve(false) },
      { text: buttons.ok, style: buttons.destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}
