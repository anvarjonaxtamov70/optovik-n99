import { limitToLast, onValue, orderByChild, push, query, ref, serverTimestamp, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { MAX_LINES, validId, type CartLine, type CartSummary } from '../domain/cart';
import {
  buildOrderWrite, readOrder, readOrderIndex, isActive, nextStatus, recomputeTotals, planStockChanges, readStockSnapshot, type CheckoutForm, type Order, type OrderIndex, type OrderStatus,
} from '../domain/order';
import { auth, classifyError, db, readServerJson, writeServerJson, withTimeout } from '../lib/firebase';
import { readLocalStrict, saveLocal } from '../lib/storage';
import { ensureCustomer, useUid } from './account';
import { useCatalogLive } from './catalog';
import { cart } from './cart';
import { checkoutQuote, assertQuoteMatches, readQuoteProduct } from '../domain/checkoutQuote';
import { readSettings } from '../domain/content';

export type PlaceError = 'auth' | 'rules' | 'rate' | 'network' | 'empty' | 'unknown';
export class PlaceOrderError extends Error {
  constructor(public reason: PlaceError) { super(reason); }
}

const RATE_MS = 30_000;

let placingOrder = false;

export async function placeOrder(lines: CartLine[], summary: CartSummary, form: CheckoutForm, lang: 'uz' | 'ru') {
  if (placingOrder) throw new PlaceOrderError('rate');
  placingOrder = true;
  try {
    return await placeOrderInternal(lines, summary, form, lang);
  } finally {
    placingOrder = false;
  }
}

async function placeOrderInternal(lines: CartLine[], summary: CartSummary, form: CheckoutForm, lang: 'uz' | 'ru') {
  if (summary.lines === 0) throw new PlaceOrderError('empty');
  let uid: string;
  try {
    uid = await ensureCustomer();
  } catch (e) {
    const kind = classifyError(e);
    throw new PlaceOrderError(kind === 'network' ? 'network' : 'auth');
  }
  const pendingKey = `pendingOrder:${uid}`;
  const pending = await readLocalStrict<{ id: string; raqam: number }>(pendingKey).catch(() => { throw new PlaceOrderError('unknown'); });
  const validPending = pending && /^[-A-Za-z0-9_]{20}$/.test(pending.id) && Number.isInteger(pending.raqam) && pending.raqam >= 100000 && pending.raqam <= 999999 ? pending : null;
  if (pending !== null && !validPending) throw new PlaceOrderError('unknown');
  const finish = async (id: string, raqam: number, phone: string, ordered: Record<string, number>, recovered: boolean) => {
    await cart.ordered(`${uid}/${id}`, ordered);
    await saveLocal('lastOrderAt', Date.now());
    await saveLocal(pendingKey, null);
    return { id, uid, raqam, phone, recovered };
  };
  if (validPending) {
    // Only an actual server response can resolve an ambiguous earlier write.
    const existing = await readServerJson(`orders/${uid}/${validPending.id}`, uid).catch(() => { throw new PlaceOrderError('network'); });
    if (existing !== null) {
      const order = readOrder(uid, validPending.id, existing);
      if (!order || order.raqam !== validPending.raqam || !order.items.length) throw new PlaceOrderError('unknown');
      return finish(order.id, order.raqam, order.mijoz.telefon, Object.fromEntries(order.items.map((item) => [item.id, item.soni])), true);
    }
    // Reuse the same key even if an earlier request is still being processed.
  } else {
    const last = (await readLocalStrict<number>('lastOrderAt').catch(() => { throw new PlaceOrderError('unknown'); })) ?? 0;
    if (Date.now() - last < RATE_MS) throw new PlaceOrderError('rate');
  }
  const orderId = validPending?.id ?? push(ref(db, `orders/${uid}`)).key as string;
  const raqam = validPending?.raqam ?? 100000 + Math.floor(Math.random() * 900000);
  let writes: ReturnType<typeof buildOrderWrite>;
  try { writes = buildOrderWrite({ uid, orderId, raqam, lines, summary, form, lang, platform: Platform.OS, ts: serverTimestamp() }); }
  catch { throw new PlaceOrderError('rules'); }
  // Fresh server reads reduce stale checkout errors; rules remain the final write gate.
  const selected = lines.filter(line => line.selected && line.product && Math.min(line.qty, line.product.qoldiq) > 0);
  const request = selected.map(line => ({ id: line.id, qty: Math.min(line.qty, line.product!.qoldiq) }));
  const prices = new Map(selected.map(line => [line.id, line.product!.narxi]));
  try {
    const [rawSettings, entries] = await Promise.all([
      readServerJson('settings/shop', uid),
      Promise.all(request.map(async line => [line.id, readQuoteProduct(await readServerJson(`tovarlar/${line.id}`, uid))] as const)),
    ]);
    const quote = checkoutQuote(request, new Map(entries), readSettings(rawSettings), form.turi);
    assertQuoteMatches(quote, summary, prices);
  } catch (error) {
    throw new PlaceOrderError(classifyError(error) === 'network' ? 'network' : 'rules');
  }
  await saveLocal(pendingKey, { id: orderId, raqam }).catch(() => { throw new PlaceOrderError('unknown'); });
  try {
    await writeServerJson(writes, uid);
  } catch (e) {
    const kind = classifyError(e);
    // A timeout or a lost response may still mean the server committed the order.
    const existing = await readServerJson(`orders/${uid}/${orderId}`, uid).catch(() => undefined);
    if (existing !== undefined && existing !== null) {
      const order = readOrder(uid, orderId, existing);
      if (!order || order.raqam !== raqam || !order.items.length) throw new PlaceOrderError('unknown');
      return finish(order.id, order.raqam, order.mijoz.telefon, Object.fromEntries(order.items.map((item) => [item.id, item.soni])), true);
    }
    if (kind === 'permission' && existing === null && !validPending) await saveLocal(pendingKey, null).catch(() => {});
    throw new PlaceOrderError(kind === 'network' || existing === undefined ? 'network' : kind === 'permission' ? 'rules' : 'unknown');
  }
  const ordered: Record<string, number> = {};
  for (const line of lines) {
    if (!line.selected || !line.product) continue;
    const qty = Math.min(line.qty, line.product.qoldiq);
    if (qty > 0) ordered[line.id] = qty;
  }
  return finish(orderId, raqam, form.telefon, ordered, false);
}

/** Recover confirmed pending orders even if checkout is no longer accessible (empty cart). */
export function usePendingOrderRecovery() {
  const uid = useUid();
  const live = useCatalogLive();
  useEffect(() => {
    if (!uid || !live || placingOrder) return;
    placingOrder = true;
    void (async () => {
      const key = `pendingOrder:${uid}`;
      const pending = await readLocalStrict<{ id: string; raqam: number }>(key);
      if (!pending || !/^[-A-Za-z0-9_]{20}$/.test(pending.id) || !Number.isInteger(pending.raqam)) return;
      const raw = await readServerJson(`orders/${uid}/${pending.id}`, uid);
      const order = readOrder(uid, pending.id, raw);
      if (!order || order.raqam !== pending.raqam || !order.items.length) return;
      await cart.ordered(`${uid}/${order.id}`, Object.fromEntries(order.items.map((item) => [item.id, item.soni])));
      await saveLocal('lastOrderAt', Date.now());
      await saveLocal(key, null);
    })().catch(() => {}).finally(() => { placingOrder = false; });
  }, [uid, live]);
}

export function useMyOrders() {
  const uid = useUid();
  const [state, setState] = useState<{ uid: string | null; orders: Order[]; loading: boolean; error: boolean }>({ uid: null, orders: [], loading: true, error: false });
  useEffect(() => {
    if (!uid) return;
    return onValue(query(ref(db, `orders/${uid}`), orderByChild('createdAt'), limitToLast(100)), (snap) => {
      const list: Order[] = [];
      snap.forEach((child) => {
        const o = readOrder(uid, child.key as string, child.val());
        if (o) list.push(o);
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
      setState({ uid, orders: list, loading: false, error: false });
    }, () => setState({ uid, orders: [], loading: false, error: true }));
  }, [uid]);
  const current = state.uid === uid ? state : { orders: [], loading: !!uid, error: false };
  return { ...current, loading: uid ? current.loading : false, signedOut: !uid };
}

export function useOrder(uid: string | undefined | null, id: string | undefined) {
  const [state, setState] = useState<{ key: string; order: Order | null; loading: boolean }>({ key: '', order: null, loading: true });
  const key = `${uid}/${id}`;
  useEffect(() => {
    if (!uid || !id) return;
    return onValue(ref(db, `orders/${uid}/${id}`), (snap) => {
      setState({ key, order: readOrder(uid, id, snap.val()), loading: false });
    }, () => setState({ key, order: null, loading: false }));
  }, [uid, id, key]);
  return state.key === key ? state : { key, order: null, loading: !!uid && !!id };
}

export async function cancelMyOrder(o: Order) {
  const base = `orders/${o.uid}/${o.id}`;
  await writeServerJson({
    [`${base}/holat`]: 'bekor',
    [`${base}/tarix/bekor`]: serverTimestamp(),
    [`${base}/updatedAt`]: serverTimestamp(),
    [`orderIndex/${o.id}/holat`]: 'bekor',
  }, o.uid);
}

/* ---------- Admin ---------- */

export function useAdminOrders(limit = 300) {
  const [state, setState] = useState<{ orders: OrderIndex[]; loading: boolean; error: boolean }>({ orders: [], loading: true, error: false });
  useEffect(() => onValue(query(ref(db, 'orderIndex'), orderByChild('createdAt'), limitToLast(limit)), (snap) => {
    const list: OrderIndex[] = [];
    snap.forEach((child) => {
      const o = readOrderIndex(child.key as string, child.val());
      if (o) list.push(o);
    });
    list.sort((a, b) => b.createdAt - a.createdAt);
    setState({ orders: list, loading: false, error: false });
  }, () => setState({ orders: [], loading: false, error: true })), [limit]);
  return state;
}

export async function adminSetStatus(o: Order, next: OrderStatus) {
  const adminUid = auth.currentUser?.uid;
  if (!adminUid) throw new Error('Not authenticated');
  const latest = readOrder(o.uid, o.id, await readServerJson(`orders/${o.uid}/${o.id}`, adminUid));
  if (!latest || latest.holat !== o.holat || latest.zaxira !== o.zaxira) throw Object.assign(new Error('Order changed'), { code: 'permission-denied' });
  o = latest;
  if (!isActive(o.holat) || (next !== 'bekor' && next !== nextStatus(o))) throw new Error('Invalid order transition');
  const totals = recomputeTotals(o);
  if (next !== 'bekor' && (!o.items.length || totals.jami !== o.jami || totals.summa !== o.summa || totals.soni !== o.soni)) throw new Error('Order totals mismatch');
  const base = `orders/${o.uid}/${o.id}`;
  const ts = serverTimestamp();
  const writes: Record<string, unknown> = {
    [`${base}/holat`]: next,
    [`${base}/tarix/${next}`]: ts,
    [`${base}/updatedAt`]: ts,
    [`orderIndex/${o.id}/holat`]: next,
  };
  // Tasdiqlashda qoldiq band qilinadi, band qilingan buyurtma bekor bo'lsa — qaytariladi.
  const reserve = next !== 'bekor' && next !== 'yangi' && !o.zaxira;
  const release = next === 'bekor' && o.zaxira;
  if (reserve || release) {
    if (!o.items.length || o.items.length > MAX_LINES || o.items.some((item) => !validId(item.id))) throw new Error('Invalid order items');
    const products = new Map(await Promise.all(o.items.map(async (item) => {
      return [item.id, readStockSnapshot(await readServerJson(`tovarlar/${item.id}`, adminUid))] as const;
    })));
    for (const change of planStockChanges(o.items, products, reserve)) {
      writes[`tovarlar/${change.id}/qoldiq`] = change.stock;
      writes[`tovarlar/${change.id}/revision`] = change.revision;
    }
    writes[`${base}/zaxira`] = reserve;
  }
  await writeServerJson(writes, adminUid);
}

export async function adminSaveNote(o: Order, note: string) {
  await withTimeout(update(ref(db, `orders/${o.uid}/${o.id}`), { adminIzoh: note.trim().slice(0, 500) }), 10000);
}
