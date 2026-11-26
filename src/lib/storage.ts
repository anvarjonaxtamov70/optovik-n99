import AsyncStorage from '@react-native-async-storage/async-storage';

// Never expose production carts, pending order IDs or profiles to a test build.
const staging = process.env.EXPO_PUBLIC_N99_ENV === 'staging';
const emulator = !!process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST;
const testProject = staging ? JSON.parse(process.env.EXPO_PUBLIC_N99_STAGING_CONFIG ?? '{}').projectId as string : '';
const PREFIX = staging ? `n99:staging:${testProject}:v2:` : emulator ? 'n99:emulator:v2:' : 'n99:v2:';
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

/** Checkout must distinguish missing local state from a failed storage read. */
export async function readLocalStrict<T>(key: string): Promise<T | null> {
  await queue.catch(() => {});
  const raw = await AsyncStorage.getItem(PREFIX + key);
  return raw === null ? null : JSON.parse(raw) as T;
}
