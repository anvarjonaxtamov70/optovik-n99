import { useMemo } from 'react';

import {
  cartLines, clampToStock, emptyCart, removeLines, restoreCart, setAllSelected, setQty, summarize, toggleLine,
  type CartState, type DeliveryKind,
} from '../domain/cart';
import type { Product } from '../domain/products';
import { createStore, useStore } from '../lib/store';
import { debouncedSaver, readLocal } from '../lib/storage';
import { catalogStore, useSettings } from './catalog';

export type CartStore = CartState & { hydrated: boolean; notice: boolean };
export const cartStore = createStore<CartStore>({ ...emptyCart, hydrated: false, notice: false });
const save = debouncedSaver('cart', 250);

export async function hydrateCart() {
  const saved = restoreCart(await readLocal('cart'));
  cartStore.set((s) => ({ ...s, items: { ...saved.items, ...s.items }, off: { ...saved.off, ...s.off }, hydrated: true }));
  cartStore.subscribe(() => {
    const { items, off } = cartStore.get();
    save({ items, off });
  });
  let lastVersion = -1;
  catalogStore.subscribe(() => {
    const c = catalogStore.get();
    if (!c.live || c.version === lastVersion) return;
    lastVersion = c.version;
    const { cart, changed } = clampToStock(cartStore.get(), c.byId);
    if (changed) cartStore.set((s) => ({ ...s, ...cart, notice: true }));
  });
}

function update(fn: (c: CartState) => CartState) {
  cartStore.set((s) => {
    const next = fn(s);
    return next === s ? s : { ...s, items: next.items, off: next.off };
  });
}

export const cart = {
  add(p: Product, qty = 1) { update((c) => setQty(c, p.id, (c.items[p.id] ?? 0) + qty, p.qoldiq)); },
  inc(p: Product) { update((c) => setQty(c, p.id, (c.items[p.id] ?? 0) + 1, p.qoldiq)); },
  dec(p: Product) { update((c) => setQty(c, p.id, (c.items[p.id] ?? 0) - 1, p.qoldiq)); },
  set(p: Product, qty: number) { update((c) => setQty(c, p.id, qty, p.qoldiq)); },
  remove(ids: string[]) { update((c) => removeLines(c, ids)); },
  restore(entries: Record<string, number>) { update((c) => ({ ...c, items: { ...c.items, ...entries } })); },
  toggle(id: string) { update((c) => toggleLine(c, id)); },
  selectAll(selected: boolean) { update((c) => setAllSelected(c, selected)); },
  dismissNotice() { cartStore.set((s) => ({ ...s, notice: false })); },
  /** Buyurtma muvaffaqiyatli yuborilgach, faqat buyurtmaga kirgan miqdorlarni ayiradi. */
  ordered(items: Record<string, number>) {
    update((c) => {
      const next = { ...c.items };
      const off = { ...c.off };
      for (const [id, q] of Object.entries(items)) {
        const left = (next[id] ?? 0) - q;
        if (left > 0) next[id] = left; else { delete next[id]; delete off[id]; }
      }
      return { items: next, off };
    });
  },
};

export const useQty = (id: string) => useStore(cartStore, (s) => s.items[id] ?? 0);
export const useCartCount = () => useStore(cartStore, (s) => {
  let n = 0;
  for (const k in s.items) n += s.items[k];
  return n;
});
export const useCartNotice = () => useStore(cartStore, (s) => s.notice);

export function useCart(kind: DeliveryKind = 'olib') {
  const items = useStore(cartStore, (s) => s.items);
  const off = useStore(cartStore, (s) => s.off);
  const byId = useStore(catalogStore, (s) => s.byId);
  const settings = useSettings();
  return useMemo(() => {
    const lines = cartLines({ items, off }, byId);
    const summary = summarize(lines, { courierEnabled: settings.courierEnabled, courierFee: settings.courierFee, freeDeliveryFrom: settings.freeDeliveryFrom }, kind);
    return { lines, summary };
  }, [items, off, byId, settings, kind]);
}
