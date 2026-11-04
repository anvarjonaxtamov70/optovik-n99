import type { Persistence } from 'firebase/auth';

// Firebase's web declarations omit this public React Native export. Metro uses
// index.rn.js, which exports it. Keep the augmentation limited to its documented
// AsyncStorage interface; do not import private Firebase paths.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
