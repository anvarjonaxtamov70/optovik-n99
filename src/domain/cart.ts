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

/** Apply a confirmed checkout receipt once, preserving unrelated cart lines. */
export function applyOrderReceipt<T extends CartState & { receipts: string[] }>(cart: T, receipt: string, ordered: Record<string, number>): T {
  if (cart.receipts.includes(receipt)) return cart;
  const items = { ...cart.items };
  const off = { ...cart.off };
  for (const [id, qty] of Object.entries(ordered)) {
    if (!validId(id) || !Number.isSafeInteger(qty) || qty <= 0) throw new Error('Invalid receipt quantity');
    const left = (items[id] ?? 0) - qty;
    if (left > 0) items[id] = left; else { delete items[id]; delete off[id]; }
  }
  return { ...cart, items, off, receipts: [...cart.receipts, receipt].slice(-20) };
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

/**
 * Katalog yangilanganda miqdorni mavjud qoldiqqa moslaydi. Faqat jonli katalogda chaqiriladi.
 * Tugagan tovar miqdori o'zgarmaydi (savatda "tugagan" deb turadi) — shuning uchun u har yangilanishda
 * «qoldiq yangilandi» xabarini qayta chiqarmaydi (avvalgi xato).
 */
export function clampToStock(cart: CartState, byId: Map<string, Product>): { cart: CartState; changed: boolean } {
  let changed = false;
  const items: Record<string, number> = {};
  for (const [id, qty] of Object.entries(cart.items)) {
    const p = byId.get(id);
    if (!p || p.qoldiq <= 0) { items[id] = qty; continue; }
    const next = Math.min(qty, p.qoldiq);
    if (next !== qty) changed = true;
    items[id] = next;
  }
  return { cart: changed ? { ...cart, items } : cart, changed };
}

/**
 * Katalogdan butunlay olib tashlangan tovarlarni savatdan o'chiradi (savatda nomi ham, narxi ham yo'q —
 * faqat tushunarsiz kod qolardi). Katalog bo'sh bo'lsa hech narsa o'chirilmaydi (ulanish xatosi bo'lishi mumkin).
 */
export function pruneMissing(cart: CartState, byId: Map<string, Product>): { cart: CartState; removed: number } {
  if (!byId.size) return { cart, removed: 0 };
  const gone = Object.keys(cart.items).filter((id) => !byId.has(id));
  return gone.length ? { cart: removeLines(cart, gone), removed: gone.length } : { cart, removed: 0 };
}

/**
 * Savatga qo'shimcha takliflar: savatdagi mashinalarga mos va o'sha bo'limlardagi tovarlar birinchi,
 * keyin ommabop va aksiyadagilar. Savatda bor va tugagan tovarlar taklif qilinmaydi.
 */
export function cartSuggestions(products: Product[], lines: CartLine[], limit = 10): Product[] {
  const inCart = new Set(lines.map((l) => l.id));
  const models = new Set<string>();
  const cats = new Set<string>();
  for (const l of lines) {
    if (!l.product) continue;
    l.product.modellar.forEach((m) => models.add(m));
    cats.add(l.product.kategoriya);
  }
  const score = (p: Product) => (p.modellar.some((m) => models.has(m)) ? 4 : 0) + (cats.has(p.kategoriya) ? 2 : 0) + (p.ommabop ? 1 : 0) + (p.eskiNarx ? 0.5 : 0);
  return products
    .filter((p) => p.qoldiq > 0 && !inCart.has(p.id))
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
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
