import { useMemo } from 'react';

import {
  cartLines, clampToStock, emptyCart, pruneMissing, removeLines, restoreCart, setAllSelected, setQty, summarize, toggleLine,
  type CartState, type DeliveryKind,
} from '../domain/cart';
import type { Product } from '../domain/products';
import { createStore, useStore } from '../lib/store';
import { debouncedSaver, readLocal, saveLocal } from '../lib/storage';
import { catalogStore, useSettings } from './catalog';

/** Savat ustidagi xabar: qoldiqqa moslandi yoki sotuvdan olingan tovarlar o'chirildi. */
export type CartNotice = 'adjusted' | 'removed' | null;
export type CartStore = CartState & { hydrated: boolean; notice: CartNotice; receipts: string[] };
export const cartStore = createStore<CartStore>({ ...emptyCart, hydrated: false, notice: null, receipts: [] });
const save = debouncedSaver('cart', 250);

export async function hydrateCart() {
  const raw = await readLocal<{ receipts?: unknown }>('cart');
  const saved = restoreCart(raw);
  const receipts = Array.isArray(raw?.receipts) ? raw.receipts.filter((v): v is string => typeof v === 'string').slice(-20) : [];
  cartStore.set((s) => ({ ...s, items: { ...saved.items, ...s.items }, off: { ...saved.off, ...s.off }, receipts, hydrated: true }));
  cartStore.subscribe(() => {
    const { items, off, receipts } = cartStore.get();
    save({ items, off, receipts });
  });
  let lastVersion = -1;
  catalogStore.subscribe(() => {
    const c = catalogStore.get();
    if (!c.live || c.version === lastVersion) return;
    lastVersion = c.version;
    const pruned = pruneMissing(cartStore.get(), c.byId);
    const { cart, changed } = clampToStock(pruned.cart, c.byId);
    if (pruned.removed || changed) cartStore.set((s) => ({ ...s, ...cart, notice: pruned.removed ? 'removed' : 'adjusted' }));
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
  /** «Qaytarish»: o'chirilgan qatorlar avvalgi miqdori va belgisi (tanlangan/tanlanmagan) bilan qaytadi. */
  restore(entries: Record<string, number>, off: string[] = []) {
    update((c) => ({ items: { ...c.items, ...entries }, off: { ...c.off, ...Object.fromEntries(off.map((id) => [id, true as const])) } }));
  },
  toggle(id: string) { update((c) => toggleLine(c, id)); },
  selectAll(selected: boolean) { update((c) => setAllSelected(c, selected)); },
  dismissNotice() { cartStore.set((s) => ({ ...s, notice: null })); },
  /** Buyurtma muvaffaqiyatli yuborilgach, faqat buyurtmaga kirgan miqdorlarni ayiradi. */
  async ordered(receipt: string, items: Record<string, number>) {
    if (!cartStore.get().hydrated) throw new Error('Cart not ready');
    cartStore.set((c) => {
      if (c.receipts.includes(receipt)) return c;
      const next = { ...c.items };
      const off = { ...c.off };
      for (const [id, q] of Object.entries(items)) {
        const left = (next[id] ?? 0) - q;
        if (left > 0) next[id] = left; else { delete next[id]; delete off[id]; }
      }
      return { ...c, items: next, off, receipts: [...c.receipts, receipt].slice(-20) };
    });
    // Store cart and receipt in one local write before clearing the pending order.
    const current = cartStore.get();
    await saveLocal('cart', { items: current.items, off: current.off, receipts: current.receipts });
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
