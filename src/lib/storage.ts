import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'n99:v2:';
let queue = Promise.resolve();

export function saveLocal(key: string, value: unknown): Promise<void> {
  queue = queue.catch(() => {}).then(() => AsyncStorage.setItem(PREFIX + key, JSON.stringify(value)));
  return queue;
}

export async function readLocal<T = unknown>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Tez-tez o'zgaradigan holat (savat, sevimlilar) uchun yozishni yig'ib yuboradi. */
export function debouncedSaver(key: string, delay = 400) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let latest: unknown;
  return (value: unknown) => {
    latest = value;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = null; void saveLocal(key, latest).catch(() => {}); }, delay);
  };
}
