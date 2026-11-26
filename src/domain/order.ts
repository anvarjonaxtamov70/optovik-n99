import { MAX_LINES, MAX_QTY, validId, type CartLine, type CartSummary, type DeliveryKind } from './cart.ts';
import { isValidLatLng, roundCoord } from './geo.ts';

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
  /** `lat`/`lng` — mijoz xaritada belgilagan nuqta (bo'lmasligi ham mumkin: eski buyurtmalar, xaritasiz telefon). */
  yetkazish: { turi: DeliveryKind; manzil?: string; moljal?: string; lat?: number; lng?: number };
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
    yetkazish: {
      turi: y.turi === 'kuryer' ? 'kuryer' : 'olib', manzil: text(y.manzil) || undefined, moljal: text(y.moljal) || undefined,
      ...(isValidLatLng(y) ? { lat: y.lat as number, lng: y.lng as number } : {}),
    },
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
  /** Ko'cha va uy (xaritadan avtomatik yoki qo'lda). */
  manzil: string;
  /** Xonadon, podyezd, qavat — ixtiyoriy, buyurtmada manzil oxiriga qo'shiladi. */
  xonadon?: string;
  moljal: string;
  izoh: string;
  /** Xaritada belgilangan nuqta. */
  lat?: number | null;
  lng?: number | null;
};

/** Onlayn to'lovlar: MCHJ ulangach yoqiladi. Hozircha «Tez kunda» bo'lib ko'rinadi (tanlab bo'lmaydi). */
export const PAYMENTS_SOON = ['payme', 'click'] as const;
/**
 * App Store tekshiruvi «tugallanmagan funksiya»ni rad etishi mumkin (2.1-qoida). Onlayn to'lov
 * do'konga chiqishdan oldin ulanmasa — shu yerda `false` qilinadi va qatorlar yashiriladi.
 */
export const SHOW_SOON_PAYMENTS = true;

/** Buyurtmaga yoziladigan to'liq manzil: ko'cha, uy + xonadon/podyezd. */
export function fullAddress(form: Pick<CheckoutForm, 'manzil' | 'xonadon'>): string {
  return [form.manzil.trim(), (form.xonadon ?? '').trim()].filter(Boolean).join(', ').slice(0, 300);
}

export function validateCheckout(form: CheckoutForm): Partial<Record<keyof CheckoutForm, 'required' | 'short' | 'phone'>> {
  const errors: Partial<Record<keyof CheckoutForm, 'required' | 'short' | 'phone'>> = {};
  if (form.ism.trim().length < 2) errors.ism = form.ism.trim() ? 'short' : 'required';
  if (!/^\+998\d{9}$/.test(form.telefon)) errors.telefon = 'phone';
  if (form.turi === 'kuryer' && fullAddress(form).length < 6) errors.manzil = form.manzil.trim() ? 'short' : 'required';
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
  let summa = 0;
  let lineCount = 0;
  for (const l of lines) {
    if (!l.selected || !l.product) continue;
    const qty = Math.min(l.qty, l.product.qoldiq);
    if (qty <= 0) continue;
    if (l.product.archived) throw new Error('Product archived');
    if (++lineCount > MAX_LINES || qty > MAX_QTY || !validId(l.id) || !Number.isSafeInteger(qty) || !Number.isSafeInteger(l.product.narxi) || l.product.narxi < 0) throw new Error('Invalid order item');
    const [cat, pid] = l.id.split('/');
    if (!cat || !pid || l.id !== l.product.id || items[cat]?.[pid]) throw new Error('Invalid or duplicate order item');
    items[cat] ??= {};
    items[cat][pid] = { nomi: l.product.nomi, narxi: l.product.narxi, soni: qty, ...(l.product.eskiNarx ? { eskiNarx: l.product.eskiNarx } : {}) };
    soni += qty;
    summa += qty * l.product.narxi;
  }
  if (!soni || lineCount !== summary.lines || !Number.isSafeInteger(summa + summary.delivery) || !Number.isSafeInteger(summa) || !Number.isSafeInteger(summary.delivery) || summary.delivery < 0 || summa !== summary.subtotal || soni !== summary.count || summa + summary.delivery !== summary.total) throw new Error('Checkout totals changed');
  const point = { lat: form.lat, lng: form.lng };
  const yetkazish = form.turi === 'kuryer'
    ? {
      turi: 'kuryer', manzil: fullAddress(form), ...(form.moljal.trim() ? { moljal: form.moljal.trim() } : {}),
      ...(isValidLatLng(point) ? { lat: roundCoord(point.lat), lng: roundCoord(point.lng) } : {}),
    }
    : { turi: 'olib' };
  const order = {
    raqam, createdAt: ts, updatedAt: ts, holat: 'yangi', tarix: { yangi: ts },
    mijoz: { ism: form.ism.trim(), telefon: form.telefon },
    yetkazish, tolov: 'naqd', ...(form.izoh.trim() ? { izoh: form.izoh.trim().slice(0, 500) } : {}),
    items, summa, yetkazishNarxi: summary.delivery, jami: summa + summary.delivery, soni,
    til: args.lang, platforma: args.platform,
  };
  const index = { uid, raqam, createdAt: ts, holat: 'yangi', jami: summa + summary.delivery, ism: form.ism.trim(), telefon: form.telefon, soni, turi: form.turi };
  return {
    [`orders/${uid}/${orderId}`]: order,
    [`orderIndex/${orderId}`]: index,
    [`customers/${uid}/lastOrderAt`]: ts,
  };
}

export function orderNumber(raqam: number): string {
  return 'N' + String(raqam).padStart(6, '0');
}

/** Validate stock plans before writing the order and all inventory revisions atomically. */
export function planStockChanges(items: OrderItem[], products: ReadonlyMap<string, { qoldiq: number; revision: number }>, reserve: boolean) {
  if (!items.length || items.length > MAX_LINES) throw new Error('Invalid order items');
  const seen = new Set<string>();
  return items.map((item) => {
    if (!validId(item.id) || seen.has(item.id) || !Number.isSafeInteger(item.soni) || item.soni < 1 || item.soni > MAX_QTY) throw new Error('Invalid order item');
    seen.add(item.id);
    const product = products.get(item.id);
    if (!product || !Number.isSafeInteger(product.qoldiq) || product.qoldiq < 0 || !Number.isSafeInteger(product.revision) || product.revision < 0) throw new Error('Order product missing or invalid');
    const stock = product.qoldiq + (reserve ? -item.soni : item.soni);
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000 || !Number.isSafeInteger(product.revision + 1)) throw new Error('Invalid resulting stock');
    return { id: item.id, stock, revision: product.revision + 1 };
  });
}

/** Preserve exact server stock; do not round invalid historical inventory. */
export function readStockSnapshot(value: unknown): { qoldiq: number; revision: number } {
  if (!isRecord(value) || typeof value.qoldiq !== 'number' || !Number.isSafeInteger(value.qoldiq) || value.qoldiq < 0 || value.qoldiq > 1_000_000) throw new Error('Invalid stock snapshot');
  const revision = value.revision === undefined ? 0 : value.revision;
  if (typeof revision !== 'number' || !Number.isSafeInteger(revision) || revision < 0) throw new Error('Invalid stock revision');
  return { qoldiq: value.qoldiq, revision };
}
