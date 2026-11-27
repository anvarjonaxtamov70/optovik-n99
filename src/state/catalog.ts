import { onAuthStateChanged } from 'firebase/auth';
import { AppState } from 'react-native';
import { candidateRequest, usesFirestoreCandidate } from '../lib/orderBackend';
import { candidateCatalog } from '../lib/candidateData';
import { onValue, ref } from 'firebase/database';

import { DEFAULT_SETTINGS, readBanners, readSettings, type Banner, type ShopSettings } from '../domain/content';
import { isPlaceholderCatalog, readCachedProducts, readProducts, toCache, type Product } from '../domain/products';
import { auth, db } from '../lib/firebase';
import { createStore, useStore } from '../lib/store';
import { readLocal, saveLocal } from '../lib/storage';

export type CatalogStatus = 'loading' | 'ready' | 'offline' | 'error';
export type CatalogState = {
  products: Product[];
  byId: Map<string, Product>;
  status: CatalogStatus;
  /** Jonli bazadan kamida bir marta katalog olindi. */
  live: boolean;
  connected: boolean;
  placeholder: boolean;
  /** null — admin hali banner qo'shmagan (tayyor bannerlar ko'rsatiladi). */
  banners: Banner[] | null;
  settings: ShopSettings;
  /** Har bir katalog yangilanishida oshadi — ro'yxatlarni qayta hisoblash uchun. */
  version: number;
};

export const catalogStore = createStore<CatalogState>({
  products: [], byId: new Map(), status: 'loading', live: false, connected: false, placeholder: false,
  banners: null, settings: DEFAULT_SETTINGS, version: 0,
});

function setProducts(products: Product[], live: boolean) {
  catalogStore.set((s) => ({
    ...s, products, byId: new Map(products.map((p) => [p.id, p])), live: s.live || live,
    placeholder: isPlaceholderCatalog(products), status: live ? 'ready' : s.status, version: s.version + 1,
  }));
}

let started = false;
let unsubs: (() => void)[] = [];

export async function startCatalog() {
  if (started) return;
  started = true;
  const [cachedProducts, cachedBanners, cachedSettings] = await Promise.all([
    readLocal('catalog'), readLocal('banners'), readLocal('settings'),
  ]);
  if (!catalogStore.get().live) {
    const products = readCachedProducts(cachedProducts);
    if (products.length) setProducts(products, false);
    catalogStore.set((s) => ({
      ...s,
      banners: cachedBanners ? readBanners(cachedBanners) : s.banners,
      settings: cachedSettings ? readSettings(cachedSettings) : s.settings,
    }));
  }
  subscribe();
}

function subscribe() {
  unsubs.forEach((u) => u());
  if(usesFirestoreCandidate){subscribeCandidate();return;}
  const slow = setTimeout(() => {
    if (!catalogStore.get().live) catalogStore.set((s) => ({ ...s, status: s.products.length ? 'offline' : 'error' }));
  }, 12000);
  unsubs = [
    onValue(ref(db, '.info/connected'), (snap) => {
      const connected = snap.val() === true;
      catalogStore.set((s) => ({ ...s, connected, status: connected ? (s.live ? 'ready' : s.status) : s.live || s.products.length ? 'offline' : s.status }));
    }),
    onValue(ref(db, 'tovarlar'), (snap) => {
      clearTimeout(slow);
      const products = readProducts(snap.val());
      setProducts(products, true);
      void saveLocal('catalog', toCache(products)).catch(() => {});
    }, () => {
      clearTimeout(slow);
      catalogStore.set((s) => ({ ...s, status: s.products.length ? 'offline' : 'error' }));
    }),
    onValue(ref(db, 'bannerlar'), (snap) => {
      const raw = snap.val();
      catalogStore.set((s) => ({ ...s, banners: snap.exists() ? readBanners(raw) : null }));
      void saveLocal('banners', raw ?? null).catch(() => {});
    }, () => {}),
    onValue(ref(db, 'settings/shop'), (snap) => {
      const raw = snap.val();
      catalogStore.set((s) => ({ ...s, settings: readSettings(raw) }));
      void saveLocal('settings', raw ?? null).catch(() => {});
    }, () => {}),
  ];
}

export function retryCatalog() {
  catalogStore.set((s) => ({ ...s, status: s.products.length ? s.status : 'loading' }));
  subscribe();
}

export const useProducts = () => useStore(catalogStore, (s) => s.products);
export const useProduct = (id: string) => useStore(catalogStore, (s) => s.byId.get(id));
export const useCatalogStatus = () => useStore(catalogStore, (s) => s.status);
export const useSettings = () => useStore(catalogStore, (s) => s.settings);
export const useBanners = () => useStore(catalogStore, (s) => s.banners);
export const useCatalogLive = () => useStore(catalogStore, (s) => s.live && s.connected);
export const usePlaceholderCatalog = () => useStore(catalogStore, (s) => s.placeholder);
export const useCatalogVersion = () => useStore(catalogStore, (s) => s.version);

function subscribeCandidate(){
 let disposed=false,running=false;
 let timer:ReturnType<typeof setTimeout>|undefined;
 const clear=()=>{if(timer!==undefined)clearTimeout(timer);};
 const refresh=async()=>{
  clear();
  if(disposed||running||AppState.currentState==='background'||AppState.currentState==='inactive')return;
  const uid=auth.currentUser?.uid;
  if(!uid)return;
  running=true;
  try{
   const [products,shop,content]=await Promise.all([candidateCatalog(uid),candidateRequest<{settings:unknown}>('/v1/shop/get',{},uid),candidateRequest<{banners:unknown}>('/v1/banners/list',{},uid)]);
   if(disposed||auth.currentUser?.uid!==uid)return;
   catalogStore.set(s=>({...s,settings:readSettings(shop.settings),banners:readBanners(content.banners),connected:true}));
   setProducts(products,true);
   void saveLocal('catalog',toCache(products)).catch(()=>{});
   void saveLocal('settings',shop.settings).catch(()=>{});
   void saveLocal('banners',content.banners).catch(()=>{});
  }catch{if(!disposed)catalogStore.set(s=>({...s,connected:false,status:s.products.length?'offline':'error'}));}
  finally{running=false;if(!disposed)timer=setTimeout(()=>{void refresh();},60000);}
 };
 const off=onAuthStateChanged(auth,()=>{catalogStore.set(s=>({...s,connected:false}));void refresh();});
 const sub=AppState.addEventListener('change',s=>{if(s==='active')void refresh();else clear();});
 unsubs=[()=>{disposed=true;clear();off();sub.remove();}];
 void refresh();
}
