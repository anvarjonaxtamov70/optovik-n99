import { createStore, useStore } from '../lib/store';
import type { Profile } from './account';

/** Rasmiylashtirish va xarita ekrani orasida ulashiladigan yetkazish manzili. */
export type DeliveryDraft = { manzil: string; xonadon: string; moljal: string; lat: number | null; lng: number | null };

type State = DeliveryDraft & { ready: boolean };
const empty: State = { manzil: '', xonadon: '', moljal: '', lat: null, lng: null, ready: false };
export const deliveryStore = createStore<State>(empty);

/** Birinchi marta saqlangan profildan to'ldiriladi (oldingi buyurtma manzili). */
export function initDeliveryDraft(p: Profile) {
  if (deliveryStore.get().ready) return;
  deliveryStore.set({ manzil: p.address, xonadon: p.apartment, moljal: p.landmark, lat: p.lat, lng: p.lng, ready: true });
}

export function setDeliveryDraft(patch: Partial<DeliveryDraft>) {
  deliveryStore.set((s) => ({ ...s, ...patch, ready: true }));
}

export const useDeliveryDraft = () => useStore(deliveryStore, (s) => s);

export function resetDeliveryDraft(){deliveryStore.set({...empty});}
