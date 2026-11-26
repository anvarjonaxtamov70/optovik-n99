import { increment, limitToLast, onValue, orderByChild, push, query, ref, serverTimestamp, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import type { CartLine, CartSummary } from '../domain/cart';
import {
  buildOrderWrite, readOrder, readOrderIndex, isActive, nextStatus, recomputeTotals, type CheckoutForm, type Order, type OrderIndex, type OrderStatus,
} from '../domain/order';
import { classifyError, db, withTimeout, type FirebaseProblem } from '../lib/firebase';
import { readLocal, saveLocal } from '../lib/storage';
import { ensureCustomer, useUid } from './account';
import { catalogStore } from './catalog';

export type PlaceError = 'auth' | 'rules' | 'rate' | 'network' | 'empty' | 'unknown';
export class PlaceOrderError extends Error {
  constructor(public reason: PlaceError) { super(reason); }
}

const RATE_MS = 30_000;

export async function placeOrder(lines: CartLine[], summary: CartSummary, form: CheckoutForm, lang: 'uz' | 'ru') {
  if (summary.lines === 0) throw new PlaceOrderError('empty');
  let uid: string;
  try {
    uid = await ensureCustomer();
  } catch (e) {
    const kind = classifyError(e);
    throw new PlaceOrderError(kind === 'network' ? 'network' : 'auth');
  }
  const last = (await readLocal<number>('lastOrderAt')) ?? 0;
  if (Date.now() - last < RATE_MS) throw new PlaceOrderError('rate');
  const orderId = push(ref(db, `orders/${uid}`)).key as string;
  const raqam = 100000 + Math.floor(Math.random() * 900000);
  const write = (f: CheckoutForm) => withTimeout(update(ref(db), buildOrderWrite({ uid, orderId, raqam, lines, summary, form: f, lang, platform: Platform.OS, ts: serverTimestamp() })), 20000);
  try {
    await write(form);
  } catch (e) {
    let kind: FirebaseProblem | null = classifyError(e);
    // Bazadagi qoidalar hali eski bo'lsa (xarita nuqtasini bilmaydi), buyurtma yo'qolmasin: nuqtasiz qayta yuboriladi.
    // Yozuv atomar — rad etilgan urinish hech narsa saqlamaydi, shuning uchun 30 soniyalik cheklov xalaqit bermaydi.
    if (kind === 'permission' && form.lat != null && form.lng != null) {
      try {
        await write({ ...form, lat: null, lng: null });
        kind = null;
      } catch (e2) {
        kind = classifyError(e2);
      }
    }
    if (kind) throw new PlaceOrderError(kind === 'network' ? 'network' : kind === 'permission' ? 'rules' : 'unknown');
  }
  await saveLocal('lastOrderAt', Date.now()).catch(() => {});
  return { id: orderId, uid, raqam };
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
  await withTimeout(update(ref(db), {
    [`${base}/holat`]: 'bekor',
    [`${base}/tarix/bekor`]: serverTimestamp(),
    [`${base}/updatedAt`]: serverTimestamp(),
    [`orderIndex/${o.id}/holat`]: 'bekor',
  }), 15000);
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
  const byId = catalogStore.get().byId;
  // Tasdiqlashda qoldiq band qilinadi, band qilingan buyurtma bekor bo'lsa — qaytariladi.
  const reserve = next !== 'bekor' && next !== 'yangi' && !o.zaxira;
  const release = next === 'bekor' && o.zaxira;
  if (reserve || release) {
    for (const item of o.items) {
      if (!byId.has(item.id)) throw new Error('Order product missing');
      writes[`tovarlar/${item.id}/qoldiq`] = increment(reserve ? -item.soni : item.soni);
      writes[`tovarlar/${item.id}/revision`] = increment(1);
    }
    writes[`${base}/zaxira`] = reserve;
  }
  await withTimeout(update(ref(db), writes), 15000);
}

export async function adminSaveNote(o: Order, note: string) {
  await withTimeout(update(ref(db, `orders/${o.uid}/${o.id}`), { adminIzoh: note.trim().slice(0, 500) }), 10000);
}
