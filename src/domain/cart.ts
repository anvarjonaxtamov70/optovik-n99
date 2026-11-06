import type { Product } from './products.ts';
import { KEY_PATTERN } from './products.ts';

export const MAX_QTY = 999;
export const MAX_LINES = 50;

export type CartState = {
  items: Record<string, number>;
  /** Savatda turgan, lekin hozir xarid qilinmaydigan (belgisi olingan) mahsulotlar. */
  off: Record<string, true>;
};

export const emptyCart: CartState = { items: {}, off: {} };

export function validId(id: string): boolean {
  const parts = id.split('/');
  return parts.length === 2 && parts.every((p) => KEY_PATTERN.test(p));
}

export function restoreCart(value: unknown): CartState {
  if (!value || typeof value !== 'object') return emptyCart;
  const raw = value as { items?: unknown; off?: unknown };
  const items: Record<string, number> = {};
  if (raw.items && typeof raw.items === 'object') {
    for (const [id, qty] of Object.entries(raw.items as Record<string, unknown>)) {
      if (validId(id) && Number.isSafeInteger(qty) && (qty as number) > 0) items[id] = Math.min(qty as number, MAX_QTY);
      if (Object.keys(items).length >= MAX_LINES) break;
    }
  }
  const off: Record<string, true> = {};
  if (raw.off && typeof raw.off === 'object') {
    for (const id of Object.keys(raw.off as object)) if (items[id]) off[id] = true;
  }
  return { items, off };
}

export function setQty(cart: CartState, id: string, qty: number, stock: number): CartState {
  const limit = Math.max(0, Math.min(stock, MAX_QTY));
  const next = Math.max(0, Math.min(Math.floor(qty), limit));
  const current = cart.items[id] ?? 0;
  if (next === current) return cart;
  if (next > 0 && !cart.items[id] && Object.keys(cart.items).length >= MAX_LINES) return cart;
  const items = { ...cart.items };
  const off = { ...cart.off };
  if (next === 0) { delete items[id]; delete off[id]; } else items[id] = next;
  return { items, off };
}

export function toggleLine(cart: CartState, id: string): CartState {
  if (!cart.items[id]) return cart;
  const off = { ...cart.off };
  if (off[id]) delete off[id]; else off[id] = true;
  return { ...cart, off };
}

export function setAllSelected(cart: CartState, selected: boolean): CartState {
  return { ...cart, off: selected ? {} : Object.fromEntries(Object.keys(cart.items).map((id) => [id, true as const])) };
}

export function removeLines(cart: CartState, ids: string[]): CartState {
  const items = { ...cart.items };
  const off = { ...cart.off };
  for (const id of ids) { delete items[id]; delete off[id]; }
  return { items, off };
}

export type CartLine = {
  id: string;
  product: Product | undefined;
  qty: number;
  selected: boolean;
  /** Mahsulot yo'q, tugagan yoki qoldiq kamaygan. */
  problem: 'missing' | 'soldout' | 'reduced' | null;
};

export function cartLines(cart: CartState, byId: Map<string, Product>): CartLine[] {
  return Object.entries(cart.items).map(([id, qty]) => {
    const product = byId.get(id);
    const problem = !product ? 'missing' : product.qoldiq <= 0 ? 'soldout' : qty > product.qoldiq ? 'reduced' : null;
    return { id, product, qty, selected: !cart.off[id] && (problem === null || problem === 'reduced'), problem };
  });
}

/** Katalog yangilanganda miqdorni mavjud qoldiqqa moslaydi. Faqat jonli katalogda chaqiriladi. */
export function clampToStock(cart: CartState, byId: Map<string, Product>): { cart: CartState; changed: boolean } {
  let changed = false;
  const items: Record<string, number> = {};
  for (const [id, qty] of Object.entries(cart.items)) {
    const p = byId.get(id);
    if (!p) { items[id] = qty; continue; }
    const next = Math.min(qty, p.qoldiq);
    if (next !== qty) changed = true;
    items[id] = next > 0 ? next : qty; // tugaganini savatda "tugagan" deb ko'rsatamiz
  }
  return { cart: changed ? { ...cart, items } : cart, changed };
}

export type DeliveryKind = 'kuryer' | 'olib';

export type Pricing = {
  courierEnabled: boolean;
  courierFee: number;
  freeDeliveryFrom: number;
};

export type CartSummary = {
  count: number;
  lines: number;
  subtotal: number;
  oldTotal: number;
  savings: number;
  delivery: number;
  total: number;
  freeLeft: number;
};

export function summarize(lines: CartLine[], pricing: Pricing, kind: DeliveryKind = 'olib'): CartSummary {
  let count = 0, subtotal = 0, oldTotal = 0, n = 0;
  for (const l of lines) {
    if (!l.selected || !l.product) continue;
    const qty = Math.min(l.qty, l.product.qoldiq);
    if (qty <= 0) continue;
    n++;
    count += qty;
    subtotal += l.product.narxi * qty;
    oldTotal += (l.product.eskiNarx ?? l.product.narxi) * qty;
  }
  const free = pricing.freeDeliveryFrom > 0 && subtotal >= pricing.freeDeliveryFrom;
  const delivery = kind === 'kuryer' && pricing.courierEnabled && !free ? pricing.courierFee : 0;
  return {
    count, lines: n, subtotal, oldTotal, savings: oldTotal - subtotal, delivery, total: subtotal + delivery,
    freeLeft: pricing.freeDeliveryFrom > 0 ? Math.max(0, pricing.freeDeliveryFrom - subtotal) : 0,
  };
}
