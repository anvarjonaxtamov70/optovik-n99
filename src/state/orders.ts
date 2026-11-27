import { limitToLast, onValue, orderByChild, push, query, ref, serverTimestamp, update } from 'firebase/database';
import { useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { MAX_LINES, validId, type CartLine, type CartSummary } from '../domain/cart';
import {
  buildOrderWrite, readOrder, readOrderIndex, isActive, nextStatus, assertFulfillableOrder, planStockChanges, readStockSnapshot, type CheckoutForm, type Order, type OrderIndex, type OrderStatus,
} from '../domain/order';
import { auth, classifyError, db, readServerJson, writeServerJson, withTimeout } from '../lib/firebase';
import { readLocalStrict, saveLocal } from '../lib/storage';
import { ensureCustomer, useUid } from './account';
import { useCatalogLive } from './catalog';
import { cart, cartStore } from './cart';
import { useStore } from '../lib/store';
import { parsePendingOrder, recoverConfirmedPending, checkoutIntent, canRetryPending } from '../domain/pendingOrder';
import { checkoutQuote, assertQuoteMatches, readQuoteProduct } from '../domain/checkoutQuote';
import { readSettings } from '../domain/content';
import { orderBackend, usesOrderBackend, abandonOrderBackend } from '../lib/orderBackend';

export type PlaceError = 'auth' | 'rules' | 'rate' | 'network' | 'empty' | 'pending-changed' | 'unknown';
export class PlaceOrderError extends Error {
  constructor(public reason: PlaceError) { super(reason); }
}

const RATE_MS = 30_000;
const rateKey=(uid:string)=>`lastOrderAt:${uid}`;

let placingOrder = false;
const recoveryListeners = new Set<() => void>();
// Identity changes share the checkout mutex so no checkout starts mid-switch.
export async function withCustomerIdentityChange<T>(task:()=>Promise<T>):Promise<T>{
  if(placingOrder)throw new PlaceOrderError('rate');
  placingOrder=true;
  try{return await task();}
  finally{placingOrder=false;for(const notify of recoveryListeners)notify();}
}
// One active attempt only; full contact/address snapshots never persist in new local records.
let sessionIntent: {uid:string;id:string;intent:string} | undefined;
function forgetIntent(uid:string,id:string){if(sessionIntent?.uid===uid&&sessionIntent.id===id)sessionIntent=undefined;}
async function loadPending(uid:string):Promise<unknown>{
  const key=`pendingOrder:${uid}`;
  const raw=await readLocalStrict(key);
  const p=parsePendingOrder(raw);
  if(!p)return raw;
  if(p.intent){
    await saveLocal(key,{id:p.id,raqam:p.raqam});
    sessionIntent={uid,id:p.id,intent:p.intent};
  }
  return {...p,intent:sessionIntent?.uid===uid&&sessionIntent.id===p.id?sessionIntent.intent:undefined};
}
/** Close an unconfirmed attempt only after a positive server acknowledgement. */
export async function closePendingAttempt():Promise<'idle'|'exists'|'abandoned'>{
  if(!usesOrderBackend||placingOrder)throw new PlaceOrderError('rate');
  const uid=auth.currentUser?.uid;
  if(!uid)throw new PlaceOrderError('auth');
  placingOrder=true;
  try{
    const raw=await loadPending(uid);
    if(raw===null)return 'idle';
    const p=parsePendingOrder(raw);
    if(!p)throw new PlaceOrderError('unknown');
    const outcome=await abandonOrderBackend({id:p.id,raqam:p.raqam},uid);
    if(auth.currentUser?.uid!==uid)throw new PlaceOrderError('auth');
    if(outcome==='abandoned'){
      await saveLocal(`pendingOrder:${uid}`,null);
      forgetIntent(uid,p.id);
    }
    return outcome;
  }finally{
    placingOrder=false;
    for(const notify of recoveryListeners)notify();
  }
}

export async function placeOrder(lines: CartLine[], summary: CartSummary, form: CheckoutForm, lang: 'uz' | 'ru') {
  if (placingOrder) throw new PlaceOrderError('rate');
  placingOrder = true;
  try {
    return await placeOrderInternal(lines, summary, form, lang);
  } finally {
    placingOrder = false;
    for (const notify of recoveryListeners) notify();
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
  const pending = await loadPending(uid).catch(() => { throw new PlaceOrderError('unknown'); });
  const validPending = parsePendingOrder(pending);
  if (pending !== null && !validPending) throw new PlaceOrderError('unknown');
  const finish = async (id: string, raqam: number, phone: string, ordered: Record<string, number>, recovered: boolean) => {
    if (auth.currentUser?.uid !== uid) throw new PlaceOrderError('auth');
    await cart.ordered(`${uid}/${id}`, ordered);
    await saveLocal(rateKey(uid), Date.now());
    await saveLocal(pendingKey, null);
    forgetIntent(uid,id);
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
    const last = (await readLocalStrict<number>(rateKey(uid)).catch(() => { throw new PlaceOrderError('unknown'); })) ?? 0;
    if (typeof last !== 'number' || !Number.isFinite(last) || last < 0) throw new PlaceOrderError('unknown');
    if (last <= Date.now() && Date.now() - last < RATE_MS) throw new PlaceOrderError('rate');
  }
  const orderId = validPending?.id ?? push(ref(db, `orders/${uid}`)).key as string;
  const raqam = validPending?.raqam ?? 100000 + Math.floor(Math.random() * 900000);
  let writes: ReturnType<typeof buildOrderWrite>;
  try { writes = buildOrderWrite({ uid, orderId, raqam, lines, summary, form, lang, platform: Platform.OS, ts: serverTimestamp() }); }
  catch { throw new PlaceOrderError('rules'); }
  let intent: string;
  try { intent = checkoutIntent(writes[`orders/${uid}/${orderId}`]); }
  catch { throw new PlaceOrderError('rules'); }
  // An ambiguous earlier submission must never be reused for a different checkout.
  if (!canRetryPending(validPending, intent)) throw new PlaceOrderError('pending-changed');
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
  if (auth.currentUser?.uid !== uid) throw new PlaceOrderError('auth');
  await saveLocal(pendingKey, { id: orderId, raqam }).catch(() => { throw new PlaceOrderError('unknown'); });
  sessionIntent={uid,id:orderId,intent};
  try {
    if (usesOrderBackend) {
      await orderBackend('/v1/orders', { id: orderId, raqam, order: writes[`orders/${uid}/${orderId}`] }, uid);
      const confirmed = readOrder(uid, orderId, await readServerJson(`orders/${uid}/${orderId}`, uid));
      if (!confirmed || confirmed.raqam !== raqam || !confirmed.items.length) throw new PlaceOrderError('unknown');
      return finish(confirmed.id, confirmed.raqam, confirmed.mijoz.telefon, Object.fromEntries(confirmed.items.map(item => [item.id, item.soni])), !!validPending);
    }
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
    if ((kind === 'permission' || kind === 'rate') && existing === null && !validPending) {
      await saveLocal(pendingKey, null).catch(() => {});
      forgetIntent(uid,orderId);
    }
    throw new PlaceOrderError(kind === 'network' || existing === undefined ? 'network' : kind === 'permission' ? 'rules' : kind === 'rate' ? 'rate' : 'unknown');
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
  const hydrated = useStore(cartStore, s => s.hydrated);
  useEffect(() => {
    if (!uid || !live || !hydrated) return;
    let disposed = false;
    let running = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const active = () => !disposed && AppState.currentState === 'active' && auth.currentUser?.uid === uid;
    const clear = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
    const schedule = () => {
      clear();
      if (active() && attempts < 8) timer = setTimeout(() => { timer = undefined; void run(); }, 15000);
    };
    const run = async () => {
      if (!active() || running) return;
      if (placingOrder) { attempts++; schedule(); return; }
      running = true;
      placingOrder = true;
      attempts++;
      let retry = false;
      try {
        const key = `pendingOrder:${uid}`;
        const result = await recoverConfirmedPending({
          active,
          load: () => loadPending(uid),
          read: async id => {
            const order = readOrder(uid, id, await readServerJson(`orders/${uid}/${id}`, uid));
            return order?.items.length ? order : null;
          },
          apply: async order => {
            await cart.ordered(`${uid}/${order.id}`, Object.fromEntries(order.items.map(item => [item.id, item.soni])));
            await saveLocal(rateKey(uid), Date.now());
            await saveLocal(key, null);
            forgetIntent(uid,order.id);
          },
        });
        retry = result === 'unresolved';
      } catch { retry = true; }
      finally {
        running = false;
        placingOrder = false;
        if (retry) schedule();
      }
    };
    const restart = () => { attempts = 0; clear(); if (active()) void run(); };
    recoveryListeners.add(restart);
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') restart(); else clear();
    });
    restart();
    return () => { disposed = true; clear(); subscription.remove(); recoveryListeners.delete(restart); };
  }, [uid, live, hydrated]);
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
  if (usesOrderBackend) return orderBackend('/v1/transition', { uid: o.uid, id: o.id, expected: o.holat, next: 'bekor' }, o.uid);
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
  if (usesOrderBackend) return orderBackend('/v1/transition', { uid: o.uid, id: o.id, expected: o.holat, next }, adminUid);
  const latest = readOrder(o.uid, o.id, await readServerJson(`orders/${o.uid}/${o.id}`, adminUid));
  if (!latest || latest.holat !== o.holat || latest.zaxira !== o.zaxira) throw Object.assign(new Error('Order changed'), { code: 'permission-denied' });
  o = latest;
  if (!isActive(o.holat) || (next !== 'bekor' && next !== nextStatus(o))) throw new Error('Invalid order transition');
  if (next !== 'bekor') assertFulfillableOrder(o);
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
