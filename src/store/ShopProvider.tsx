import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import { onValue, ref } from 'firebase/database';

import { db } from '../../firebaseConfig';
import { initialShopState, readProducts, shopReducer, type ShopAction, type ShopState } from './shop';

type ShopContextValue = { state: ShopState; dispatch: Dispatch<ShopAction>; retry: () => void };
const ShopContext = createContext<ShopContextValue | null>(null);

export function ShopProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shopReducer, initialShopState);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    dispatch({ type: 'loading' });
    const timer = setTimeout(() => {
      if (active) dispatch({ type: 'slow' });
    }, 20000);
    const unsubscribe = onValue(
      ref(db, 'tovarlar'),
      (snapshot) => {
        if (!active) return;
        clearTimeout(timer);
        const products = readProducts(snapshot.val());
        dispatch({
          type: 'products', products,
          message: products.length ? '' : snapshot.exists() ? 'Mahsulot ma’lumotlari kutilgan shaklda emas.' : 'Hozircha mahsulotlar yo‘q.',
        });
      },
      () => {
        clearTimeout(timer);
        if (active) dispatch({ type: 'error' });
      }
    );
    return () => { active = false; clearTimeout(timer); unsubscribe(); };
  }, [attempt]);

  const value = useMemo(() => ({ state, dispatch, retry }), [state, retry]);
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop() {
  const context = useContext(ShopContext);
  if (!context) throw new Error('ShopProvider topilmadi.');
  return context;
}
