import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@optovik_app_secret_key';
// Expo Go da .env dagi EXPO_PUBLIC_APP_SECRET ishlatiladi
const VALID_SECRET = process.env.EXPO_PUBLIC_APP_SECRET || 'OPTOVIK_N99_ACCESS';

export const checkAppAccess = async (): Promise<boolean> => {
  try {
    const savedKey = await AsyncStorage.getItem(STORAGE_KEY);
    return savedKey === VALID_SECRET;
  } catch {
    return false;
  }
};

export const saveAppSecret = async (inputKey: string): Promise<boolean> => {
  if (inputKey.trim() === VALID_SECRET) {
    await AsyncStorage.setItem(STORAGE_KEY, inputKey.trim());
    return true;
  }
  return false;
};

export const clearAppSecret = async (): Promise<void> => {
  await AsyncStorage.removeItem(STORAGE_KEY);
};
