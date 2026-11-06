import type { CartLine, CartSummary, DeliveryKind } from './cart.ts';

export type OrderStatus = 'yangi' | 'tasdiqlandi' | 'yolda' | 'tayyor' | 'yetkazildi' | 'bekor';
export const ORDER_STATUSES: OrderStatus[] = ['yangi', 'tasdiqlandi', 'yolda', 'tayyor', 'yetkazildi', 'bekor'];

export type OrderItem = { id: string; nomi: string; narxi: number; soni: number; eskiNarx?: number };

export type Order = {
  id: string;
  uid: string;
  raqam: number;
  createdAt: number;
  updatedAt: number;
  holat: OrderStatus;
  tarix: Partial<Record<OrderStatus, number>>;
  mijoz: { ism: string; telefon: string };
  yetkazish: { turi: DeliveryKind; manzil?: string; moljal?: string };
  tolov: 'naqd';
  izoh?: string;
  items: OrderItem[];
  summa: number;
  yetkazishNarxi: number;
  jami: number;
  soni: number;
  zaxira: boolean;
  adminIzoh?: string;
};

export type OrderIndex = {
  id: string; uid: string; raqam: number; createdAt: number; holat: OrderStatus; jami: number;
  ism: string; telefon: string; soni: number; turi: DeliveryKind;
};

/** Holatlar ketma-ketligi — yetkazish turiga qarab. */
export function statusFlow(kind: DeliveryKind): OrderStatus[] {
  return kind === 'kuryer' ? ['yangi', 'tasdiqlandi', 'yolda', 'yetkazildi'] : ['yangi', 'tasdiqlandi', 'tayyor', 'yetkazildi'];
}

export function nextStatus(o: Pick<Order, 'holat' | 'yetkazish'>): OrderStatus | null {
  if (o.holat === 'bekor' || o.holat === 'yetkazildi') return null;
  const flow = statusFlow(o.yetkazish.turi);
  const i = flow.indexOf(o.holat);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

export function isActive(s: OrderStatus): boolean {
  return s !== 'bekor' && s !== 'yetkazildi';
}

export function canCustomerCancel(o: Pick<Order, 'holat'>): boolean {
  return o.holat === 'yangi';
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const text = (v: unknown) => (typeof v === 'string' ? v : '');

export function readOrder(uid: string, id: string, v: unknown): Order | null {
  if (!isRecord(v)) return null;
  const holat = ORDER_STATUSES.includes(v.holat as OrderStatus) ? (v.holat as OrderStatus) : null;
  if (!holat) return null;
  const items: OrderItem[] = [];
  if (isRecord(v.items)) {
    for (const [cat, group] of Object.entries(v.items)) {
      if (!isRecord(group)) continue;
      for (const [pid, it] of Object.entries(group)) {
        if (!isRecord(it)) continue;
        items.push({ id: `${cat}/${pid}`, nomi: text(it.nomi), narxi: num(it.narxi), soni: num(it.soni), eskiNarx: typeof it.eskiNarx === 'number' ? it.eskiNarx : undefined });
      }
    }
  }
  const tarix: Order['tarix'] = {};
  if (isRecord(v.tarix)) for (const s of ORDER_STATUSES) if (typeof v.tarix[s] === 'number') tarix[s] = v.tarix[s] as number;
  const y = isRecord(v.yetkazish) ? v.yetkazish : {};
  const m = isRecord(v.mijoz) ? v.mijoz : {};
  return {
    id, uid, raqam: num(v.raqam), createdAt: num(v.createdAt), updatedAt: num(v.updatedAt) || num(v.createdAt), holat, tarix,
    mijoz: { ism: text(m.ism), telefon: text(m.telefon) },
    yetkazish: { turi: y.turi === 'kuryer' ? 'kuryer' : 'olib', manzil: text(y.manzil) || undefined, moljal: text(y.moljal) || undefined },
    tolov: 'naqd', izoh: text(v.izoh) || undefined, items,
    summa: num(v.summa), yetkazishNarxi: num(v.yetkazishNarxi), jami: num(v.jami), soni: num(v.soni),
    zaxira: v.zaxira === true, adminIzoh: text(v.adminIzoh) || undefined,
  };
}

export function readOrderIndex(id: string, v: unknown): OrderIndex | null {
  if (!isRecord(v) || typeof v.uid !== 'string') return null;
  const holat = ORDER_STATUSES.includes(v.holat as OrderStatus) ? (v.holat as OrderStatus) : null;
  if (!holat) return null;
  return {
    id, uid: v.uid, raqam: num(v.raqam), createdAt: num(v.createdAt), holat, jami: num(v.jami),
    ism: text(v.ism), telefon: text(v.telefon), soni: num(v.soni), turi: v.turi === 'kuryer' ? 'kuryer' : 'olib',
  };
}

/** Buyurtma summasi har doim tovarlardan qayta hisoblanadi — bazadagi `jami` ga ko'r-ko'rona ishonilmaydi. */
export function recomputeTotals(o: Pick<Order, 'items' | 'yetkazishNarxi'>) {
  const summa = o.items.reduce((s, i) => s + i.narxi * i.soni, 0);
  return { summa, jami: summa + o.yetkazishNarxi, soni: o.items.reduce((s, i) => s + i.soni, 0) };
}

export type CheckoutForm = {
  ism: string;
  telefon: string; // +998XXXXXXXXX
  turi: DeliveryKind;
  manzil: string;
  moljal: string;
  izoh: string;
};

export function validateCheckout(form: CheckoutForm): Partial<Record<keyof CheckoutForm, 'required' | 'short' | 'phone'>> {
  const errors: Partial<Record<keyof CheckoutForm, 'required' | 'short' | 'phone'>> = {};
  if (form.ism.trim().length < 2) errors.ism = form.ism.trim() ? 'short' : 'required';
  if (!/^\+998\d{9}$/.test(form.telefon)) errors.telefon = 'phone';
  if (form.turi === 'kuryer' && form.manzil.trim().length < 6) errors.manzil = form.manzil.trim() ? 'short' : 'required';
  return errors;
}

/**
 * Buyurtma uchun bitta atomar multi-path yozuv. `ts` — Firebase serverTimestamp() qiymati.
 * Qoidalar (database.rules.json) narx, qoldiq, vaqt va indeks mosligini server tomonda tekshiradi.
 */
export function buildOrderWrite(args: {
  uid: string; orderId: string; raqam: number; lines: CartLine[]; summary: CartSummary; form: CheckoutForm;
  lang: 'uz' | 'ru'; platform: string; ts: object;
}) {
  const { uid, orderId, raqam, lines, summary, form, ts } = args;
  const items: Record<string, Record<string, { nomi: string; narxi: number; soni: number; eskiNarx?: number }>> = {};
  let soni = 0;
  for (const l of lines) {
    if (!l.selected || !l.product) continue;
    const qty = Math.min(l.qty, l.product.qoldiq);
    if (qty <= 0) continue;
    const [cat, pid] = l.id.split('/');
    items[cat] ??= {};
    items[cat][pid] = { nomi: l.product.nomi, narxi: l.product.narxi, soni: qty, ...(l.product.eskiNarx ? { eskiNarx: l.product.eskiNarx } : {}) };
    soni += qty;
  }
  const yetkazish = form.turi === 'kuryer'
    ? { turi: 'kuryer', manzil: form.manzil.trim(), ...(form.moljal.trim() ? { moljal: form.moljal.trim() } : {}) }
    : { turi: 'olib' };
  const order = {
    raqam, createdAt: ts, updatedAt: ts, holat: 'yangi', tarix: { yangi: ts },
    mijoz: { ism: form.ism.trim(), telefon: form.telefon },
    yetkazish, tolov: 'naqd', ...(form.izoh.trim() ? { izoh: form.izoh.trim().slice(0, 500) } : {}),
    items, summa: summary.subtotal, yetkazishNarxi: summary.delivery, jami: summary.total, soni,
    til: args.lang, platforma: args.platform,
  };
  const index = { uid, raqam, createdAt: ts, holat: 'yangi', jami: summary.total, ism: form.ism.trim(), telefon: form.telefon, soni, turi: form.turi };
  return {
    [`orders/${uid}/${orderId}`]: order,
    [`orderIndex/${orderId}`]: index,
    [`customers/${uid}/lastOrderAt`]: ts,
  };
}

export function orderNumber(raqam: number): string {
  return 'N' + String(raqam).padStart(6, '0');
}
