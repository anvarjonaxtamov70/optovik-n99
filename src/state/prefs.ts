import { getLocales } from 'expo-localization';

import type { Lang } from '../domain/money';
import { modelBySlug } from '../domain/taxonomy';
import { createStore, useStore } from '../lib/store';
import { debouncedSaver, readLocal } from '../lib/storage';

export type MyCar = { model: string; year?: number };
export type Prefs = {
  hydrated: boolean;
  lang: Lang;
  favorites: string[];
  recent: string[];
  car: MyCar | null;
};

function deviceLang(): Lang {
  try {
    return getLocales()[0]?.languageCode === 'ru' ? 'ru' : 'uz';
  } catch {
    return 'uz';
  }
}

export const prefsStore = createStore<Prefs>({ hydrated: false, lang: deviceLang(), favorites: [], recent: [], car: null });
const save = debouncedSaver('prefs');

export async function hydratePrefs() {
  const saved = await readLocal<Partial<Prefs>>('prefs');
  prefsStore.set((s) => ({
    hydrated: true,
    lang: saved?.lang === 'ru' || saved?.lang === 'uz' ? saved.lang : s.lang,
    favorites: Array.isArray(saved?.favorites) ? saved.favorites.filter((x): x is string => typeof x === 'string').slice(-500) : [],
    recent: Array.isArray(saved?.recent) ? saved.recent.filter((x): x is string => typeof x === 'string').slice(0, 10) : [],
    car: saved?.car && typeof saved.car === 'object' && modelBySlug((saved.car as MyCar).model)
      ? { model: (saved.car as MyCar).model, year: typeof (saved.car as MyCar).year === 'number' ? (saved.car as MyCar).year : undefined }
      : null,
  }));
  prefsStore.subscribe(() => {
    const { hydrated: _h, ...rest } = prefsStore.get();
    save(rest);
  });
}

export const prefs = {
  toggleFavorite(id: string): boolean {
    let added = false;
    prefsStore.set((s) => {
      added = !s.favorites.includes(id);
      return { ...s, favorites: added ? [...s.favorites, id].slice(-500) : s.favorites.filter((x) => x !== id) };
    });
    return added;
  },
  addRecent(query: string) {
    const q = query.trim();
    if (q.length < 2) return;
    prefsStore.set((s) => ({ ...s, recent: [q, ...s.recent.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 10) }));
  },
  clearRecent() { prefsStore.set((s) => ({ ...s, recent: [] })); },
  setCar(car: MyCar | null) { prefsStore.set((s) => ({ ...s, car })); },
  setLang(lang: Lang) { prefsStore.set((s) => ({ ...s, lang })); },
};

export const useIsFavorite = (id: string) => useStore(prefsStore, (s) => s.favorites.includes(id));
export const useFavorites = () => useStore(prefsStore, (s) => s.favorites);
export const useMyCar = () => useStore(prefsStore, (s) => s.car);
export const useRecent = () => useStore(prefsStore, (s) => s.recent);
