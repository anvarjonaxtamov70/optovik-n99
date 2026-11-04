import { limitToLast, onValue, orderByChild, query, ref } from 'firebase/database';
import { httpsCallable } from 'firebase/functions';
import { useEffect, useState } from 'react';

import { db } from '../../firebaseConfig';
import { commerceEnabled, functions } from './firebase';

export type OrderStatus = 'pending' | 'accepted' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export const statusLabels: Record<OrderStatus, string> = { pending: 'Kutilmoqda', accepted: 'Qabul qilindi', shipped: 'Yo‘lda', delivered: 'Yetkazildi', cancelled: 'Bekor qilindi', returned: 'Qaytarildi' };
export type Order = {
  id: string; uid: string; createdAt: number; updatedAt: number; status: OrderStatus;
  customer: { name: string; phone: string; address: string };
  delivery: 'pickup' | 'courier'; payment: 'cash'; note: string;
  items: { id: string; name: string; price: number; quantity: number }[];
  subtotal: number; shipping: number; cashbackUsed: number; cashbackEarned: number; total: number;
};
export type CheckoutInput = {
  attemptId: string; items: { id: string; quantity: number }[];
  customer: Order['customer']; delivery: Order['delivery']; note: string;
  expectedTotal: number; useCashback: boolean;
};
export function createOrder(input: CheckoutInput) {
  return httpsCallable<CheckoutInput, { id: string; uid: string }>(functions, 'createOrder', { timeout: 30000 })(input);
}
export function changeOrder(uid: string, id: string, status: OrderStatus, expectedStatus: OrderStatus) {
  return httpsCallable(functions, 'changeOrderStatus', { timeout: 30000 })({ uid, id, status, expectedStatus });
}
export function useOrders(uid: string | undefined, adminIndex = false) {
  const [result, setResult] = useState<{ key: string; orders: Order[]; problem: string } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = (uid ?? '') + ':' + adminIndex + ':' + attempt;
  useEffect(() => {
    if (!uid || !commerceEnabled) return;
    return onValue(query(ref(db, adminIndex ? 'orderIndex' : 'orders/' + uid), orderByChild('createdAt'), limitToLast(100)), (s) => {
      const orders = Object.values(s.val() ?? {}).sort((a, b) => (b as Order).createdAt - (a as Order).createdAt) as Order[];
      setResult({ key, orders, problem: '' });
    }, () => setResult({ key, orders: [], problem: 'Buyurtmalarni yuklab bo‘lmadi.' }));
  }, [uid, adminIndex, key]);
  const current = result?.key === key ? result : null;
  return { orders: current?.orders ?? [], loading: !!uid && commerceEnabled && !current,
    problem: current?.problem ?? '', retry: () => setAttempt((n) => n + 1) };
}
export function useCommerceSettings() {
  const [settings, setSettings] = useState({ courierEnabled: false, shippingFee: 0 });
  useEffect(() => {
    if (!commerceEnabled) return;
    return onValue(ref(db, 'settings/commerce'), (s) => {
      const value = s.val() ?? {};
      setSettings({ courierEnabled: value.courierEnabled === true && Number.isSafeInteger(value.shippingFee) && value.shippingFee >= 0,
        shippingFee: Number.isSafeInteger(value.shippingFee) && value.shippingFee >= 0 ? value.shippingFee : 0 });
    }, () => setSettings({ courierEnabled: false, shippingFee: 0 }));
  }, []);
  return settings;
}
