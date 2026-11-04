import AsyncStorage from '@react-native-async-storage/async-storage';

let pending = Promise.resolve();
export function saveLocal(key: string, value: unknown): Promise<void> {
  pending = pending.catch(() => {}).then(() => AsyncStorage.setItem('n99:v1:' + key, JSON.stringify(value)));
  return pending;
}
export async function readLocal<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem('n99:v1:' + key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}
