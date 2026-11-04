// Pure order rules. Firebase is only an adapter; tests need no cloud credentials.
import { createHash } from 'node:crypto';

export class DomainError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}
function fail(message, code = 'failed-precondition') { throw new DomainError(code, message); }
const keyPattern = /^[^.#$\[\]/\u0000-\u001f]{1,100}$/;
export function productPath(id) {
  const parts = typeof id === 'string' ? id.split('/') : [];
  if (parts.length !== 2 || !parts.every((s) => keyPattern.test(s) && !['__proto__', 'constructor', 'prototype'].includes(s))) fail('Mahsulot IDsi noto‘g‘ri.', 'invalid-argument');
  return parts;
}
function text(value, max, min = 0) {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) fail('Kiritilgan ma’lumotlarni tekshiring.', 'invalid-argument');
  return value.trim();
}
function money(value) { return Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000; }
function stock(value) { return Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000; }
function product(root, id) { const [cat, key] = productPath(id); return root.tovarlar?.[cat]?.[key]; }
function sumIndex(order) { return { id: order.id, uid: order.uid, total: order.total, createdAt: order.createdAt, status: order.status }; }
export function normalizeCheckout(data) {
  if (!data || typeof data !== 'object') fail('Buyurtma noto‘g‘ri.', 'invalid-argument');
  const attemptId = text(data.attemptId, 80, 12);
  if (!/^[a-zA-Z0-9_-]+$/.test(attemptId)) fail('Buyurtma raqami noto‘g‘ri.', 'invalid-argument');
  if (!Array.isArray(data.items) || data.items.length < 1 || data.items.length > 50) fail('Savatda 1–50 turdagi mahsulot bo‘lishi kerak.', 'invalid-argument');
  const seen = new Set();
  const items = data.items.map((p) => {
    productPath(p?.id);
    if (seen.has(p.id) || !Number.isSafeInteger(p.quantity) || p.quantity < 1 || p.quantity > 999) fail('Mahsulot miqdori noto‘g‘ri.', 'invalid-argument');
    seen.add(p.id); return { id: p.id, quantity: p.quantity };
  }).sort((a, b) => a.id.localeCompare(b.id));
  const customer = { name: text(data.customer?.name, 80, 2), phone: text(data.customer?.phone, 24, 9), address: text(data.customer?.address ?? '', 300) };
  if (!/^\+?[\d ()-]+$/.test(customer.phone) || !/^\d{9,15}$/.test(customer.phone.replace(/\D/g, ''))) fail('Telefon raqamini tekshiring.', 'invalid-argument');
  if (!['pickup', 'courier'].includes(data.delivery) || (data.delivery === 'courier' && customer.address.length < 8)) fail('Yetkazish ma’lumotlarini tekshiring.', 'invalid-argument');
  if (!Number.isSafeInteger(data.expectedTotal) || data.expectedTotal < 0) fail('Summani tekshiring.', 'invalid-argument');
  return { attemptId, items, customer, delivery: data.delivery, note: text(data.note ?? '', 500), expectedTotal: data.expectedTotal, useCashback: data.useCashback === true };
}
export function orderId(uid, attemptId) { return createHash('sha256').update(uid + ':' + attemptId).digest('hex').slice(0, 24); }
export function placeOrder(current, uid, input, now) {
  const root = structuredClone(current);
  const id = orderId(uid, input.attemptId);
  const signature = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const previous = root.orders?.[uid]?.[id];
  if (previous) {
    if (previous.signature !== signature) fail('Bu urinish raqami boshqa buyurtmaga tegishli.');
    return root;
  }
  root.customers ??= {}; root.customers[uid] ??= {};
  const customer = root.customers[uid];
  const recent = (Array.isArray(customer.orderTimes) ? customer.orderTimes : []).filter((t) => Number.isFinite(t) && t > now - 86400000);
  if (recent.length >= 20 || recent.filter((t) => t > now - 60000).length >= 3) fail('Buyurtmalar ko‘payib ketdi. Birozdan keyin urinib ko‘ring.', 'resource-exhausted');
  const items = input.items.map((line) => {
    const p = product(root, line.id);
    if (!p || !money(p.narxi) || !stock(p.qoldiq) || typeof p.nomi !== 'string') fail('Mahsulot ma’lumoti yangilandi. Savatni qayta tekshiring.');
    if (p.qoldiq < line.quantity) fail(p.nomi + ': omborda ' + p.qoldiq + ' dona qoldi.');
    return { ...line, name: p.nomi, price: p.narxi };
  });
  const settings = root.settings?.commerce ?? {};
  if (input.delivery === 'courier' && (settings.courierEnabled !== true || !money(settings.shippingFee))) fail('Yetkazib berish hozir mavjud emas. Do‘kondan olishni tanlang.');
  const shipping = input.delivery === 'courier' ? settings.shippingFee : 0;
  const subtotal = items.reduce((s, p) => s + p.price * p.quantity, 0);
  if (!Number.isSafeInteger(subtotal) || subtotal > 1_000_000_000_000) fail('Buyurtma summasi juda katta.', 'invalid-argument');
  const balance = Number.isSafeInteger(customer.balance) ? customer.balance : 0;
  const cashbackUsed = input.useCashback ? Math.min(Math.max(0, balance), Math.floor(subtotal * 0.2)) : 0;
  const total = subtotal + shipping - cashbackUsed;
  if (total !== input.expectedTotal) fail('Narx yoki cashback balansi yangilandi. Savatdagi summani tekshirib, qayta tasdiqlang.');
  const bps = Number.isInteger(settings.cashbackBps) ? Math.max(0, Math.min(1000, settings.cashbackBps)) : 0;
  const cashbackEarned = Math.floor((subtotal - cashbackUsed) * bps / 10000);
  for (const line of items) { const p = product(root, line.id); p.qoldiq -= line.quantity; p.revision = (p.revision ?? 0) + 1; }
  const order = { id, uid, signature, items, customer: input.customer, delivery: input.delivery, note: input.note, payment: 'cash', subtotal, shipping, cashbackUsed, cashbackEarned, total,
    createdAt: now, updatedAt: now, status: 'pending' };
  root.orders ??= {}; root.orders[uid] ??= {}; root.orders[uid][id] = order;
  root.orderIndex ??= {}; root.orderIndex[id] = sumIndex(order);
  customer.balance = balance - cashbackUsed; customer.orderTimes = [...recent, now];
  return root;
}
export const transitions = { pending: ['accepted', 'cancelled'], accepted: ['shipped', 'cancelled'], shipped: ['delivered', 'cancelled'], delivered: ['returned'], cancelled: [], returned: [] };
export function moveOrder(current, actor, data, now) {
  const root = structuredClone(current);
  if (!keyPattern.test(data?.uid ?? '') || !/^[a-f0-9]{24}$/.test(data?.id ?? '')) fail('Buyurtma IDsi noto‘g‘ri.', 'invalid-argument');
  const o = root.orders?.[data.uid]?.[data.id];
  if (!o) fail('Buyurtma topilmadi.', 'not-found');
  if (!actor.admin && (actor.uid !== data.uid || data.status !== 'cancelled' || !['pending', 'cancelled'].includes(o.status))) fail('Bu amal uchun ruxsat yo‘q.', 'permission-denied');
  if (!Object.hasOwn(transitions, data.status)) fail('Holat noto‘g‘ri.', 'invalid-argument');
  if (o.status === data.status) return root;
  if (o.status !== data.expectedStatus || !transitions[o.status]?.includes(data.status)) fail('Buyurtma holati o‘zgargan. Ekranni yangilang.');
  const c = root.customers[data.uid];
  if (data.status === 'cancelled' || data.status === 'returned') {
    for (const line of o.items) {
      const p = product(root, line.id);
      if (p) { p.qoldiq += line.quantity; p.revision = (p.revision ?? 0) + 1; }
    }
    c.balance = (c.balance ?? 0) + o.cashbackUsed - (o.status === 'delivered' ? o.cashbackEarned : 0);
  }
  if (data.status === 'delivered') c.balance = (c.balance ?? 0) + o.cashbackEarned;
  o.status = data.status; o.updatedAt = now;
  root.orderIndex[o.id] = sumIndex(o);
  return root;
}
export function updateProduct(current, data) {
  const root = structuredClone(current);
  const [cat, id] = productPath(data?.id);
  const existing = root.tovarlar?.[cat]?.[id];
  if ((existing ? (existing.revision ?? 0) : null) !== data.expectedRevision) fail('Mahsulot yoki qoldiq yangilangan. Qayta tanlab tahrirlang.');
  if (!money(data.narxi) || !stock(data.qoldiq) || !money(data.eskiNarx)) fail('Narx va qoldiq butun, manfiy bo‘lmagan son bo‘lsin.', 'invalid-argument');
  const p = { nomi: text(data.nomi, 160, 2), narxi: data.narxi, qoldiq: data.qoldiq,
    artikul: text(data.artikul ?? '', 80), model: text(data.model ?? '', 100), tavsif: text(data.tavsif ?? '', 5000), rasm: text(data.rasm ?? '', 2000), eskiNarx: data.eskiNarx,
    revision: (existing?.revision ?? 0) + 1 };
  if (p.rasm && !/^https:\/\/[^\s]+$/.test(p.rasm)) fail('Rasm manzili HTTPS bilan boshlansin.', 'invalid-argument');
  if (p.eskiNarx && p.eskiNarx <= p.narxi) fail('Eski narx amaldagi narxdan katta bo‘lsin.', 'invalid-argument');
  root.tovarlar ??= {}; root.tovarlar[cat] ??= {}; root.tovarlar[cat][id] = { ...existing, ...p };
  return root;
}
