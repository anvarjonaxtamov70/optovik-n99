import { onValue, ref } from 'firebase/database';
import { createContext, useContext, useEffect, useReducer, useState, type Dispatch, type ReactNode } from 'react';

import { db } from '../../firebaseConfig';
import { readLocal, saveLocal } from '../lib/storage';
import { initialShopState, readProducts, shopReducer, type ShopAction, type ShopState } from './shop';

const ShopContext = createContext<{
  state: ShopState; dispatch: Dispatch<ShopAction>; retry: () => void;
  favorites: string[]; toggleFavorite: (id: string) => void; storageProblem: boolean;
} | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shopReducer, initialShopState);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [storageProblem, setStorageProblem] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void readLocal<{ quantities?: Record<string, number>; favorites?: string[] }>('shop').then((saved) => {
      if (!active) return;
      if (saved?.quantities && typeof saved.quantities === 'object') dispatch({ type: 'restore', quantities: saved.quantities });
      if (Array.isArray(saved?.favorites)) setFavorites(saved.favorites.filter((x) => typeof x === 'string').slice(0, 500));
    }).catch(() => { if (active) setStorageProblem(true); }).finally(() => { if (active) setHydrated(true); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    void saveLocal('shop', { quantities: state.quantities, favorites }).then(() => setStorageProblem(false)).catch(() => setStorageProblem(true));
  }, [hydrated, state.quantities, favorites]);
  useEffect(() => {
    if (!hydrated) return;
    let active = true;
    let connected = false;
    let latest: { products: ShopState['products']; message: string } | null = null;
    dispatch({ type: 'loading' });
    const timer = setTimeout(() => { if (active) dispatch({ type: 'slow' }); }, 20000);
    const offConnection = onValue(ref(db, '.info/connected'), (s) => {
      connected = s.val() === true;
      if (!active) return;
      if (!connected && latest) dispatch({ type: 'slow' });
      else if (latest) dispatch({ type: 'products', ...latest });
    });
    const unsubscribe = onValue(ref(db, 'tovarlar'), (snapshot) => {
      if (!active) return;
      clearTimeout(timer);
      const products = readProducts(snapshot.val());
      latest = { products, message: products.length ? '' : snapshot.exists() ? 'Mahsulot ma’lumotlarini tekshirish kerak.' : 'Hozircha mahsulotlar yo‘q.' };
      dispatch({ type: 'products', ...latest });
      if (!connected) dispatch({ type: 'slow' });
    }, () => { if (active) { clearTimeout(timer); latest = null; dispatch({ type: 'error' }); } });
    return () => { active = false; clearTimeout(timer); unsubscribe(); offConnection(); };
  }, [attempt, hydrated]);
  return <ShopContext.Provider value={{ state, dispatch, favorites, storageProblem,
    retry: () => setAttempt((n) => n + 1),
    toggleFavorite: (id) => setFavorites((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id].slice(-500)),
  }}>{children}</ShopContext.Provider>;
}
export function useShop() {
  const value = useContext(ShopContext);
  if (!value) throw new Error('ShopProvider is missing');
  return value;
}
