import { get, onValue, push, ref, remove, serverTimestamp, set, update } from 'firebase/database';

import { LEGACY_PUBLIC_MEDIA_FIELDS, readBanners, readMediaKey, type Banner, type ShopSettings } from '../domain/content';
import type { Product } from '../domain/products';
import { candidateAck } from '../lib/candidateData';
import { candidateRequest, usesFirestoreCandidate } from '../lib/orderBackend';
import { retryCatalog } from './catalog';
import { auth, db, withTimeout } from '../lib/firebase';
import { createStore, useStore } from '../lib/store';

export type ProductForm = {
  kategoriya: string;
  nomi: string;
  narxi: string;
  eskiNarx: string;
  qoldiq: string;
  birlik: string;
  artikul: string;
  brend: string;
  model: string;
  tavsif: string;
  rasmlar: string[];
  ommabop: boolean;
  yangi: boolean;
  tartib: string;
};

export function formFromProduct(p?: Product): ProductForm {
  return {
    kategoriya: p?.kategoriya ?? 'dvigatel', nomi: p?.nomi ?? '', narxi: p ? String(p.narxi) : '', eskiNarx: p?.eskiNarx ? String(p.eskiNarx) : '',
    qoldiq: p ? String(p.qoldiq) : '', birlik: p?.birlik ?? '', artikul: p?.artikul ?? '', brend: p?.brend ?? '', model: p?.model ?? '',
    tavsif: p?.tavsif ?? '', rasmlar: p?.rasmlar ?? [], ommabop: p?.ommabop ?? false, yangi: p?.yangi ?? !p, tartib: p?.tartib ? String(p.tartib) : '',
  };
}

/** Mavjud tovardan yangi tovar uchun forma: hamma maydon ko'chiriladi, nomiga belgi qo'shiladi. */
export function formFromCopy(p: Product, suffix: string): ProductForm {
  return { ...formFromProduct(p), nomi: `${p.nomi} ${suffix}`.slice(0, 160), yangi: true };
}

/** "Saqlash va yana qo'shish" dan keyingi bo'sh forma: kategoriya saqlanadi. */
export function nextNewForm(prev: ProductForm): ProductForm {
  return { ...formFromProduct(), kategoriya: prev.kategoriya };
}

const int = (s: string) => (/^\d{1,10}$/.test(s.replace(/\s/g, '')) ? parseInt(s.replace(/\s/g, ''), 10) : NaN);

export function validateProduct(f: ProductForm): Partial<Record<keyof ProductForm, string>> {
  const e: Partial<Record<keyof ProductForm, string>> = {};
  if (f.nomi.trim().length < 2 || f.nomi.trim().length > 160) e.nomi = 'name';
  if (!Number.isSafeInteger(int(f.narxi)) || int(f.narxi) > 1_000_000_000) e.narxi = 'price';
  if (!Number.isSafeInteger(int(f.qoldiq)) || int(f.qoldiq) > 1_000_000) e.qoldiq = 'stock';
  if (f.eskiNarx.trim() && (!(int(f.eskiNarx) > int(f.narxi)) || int(f.eskiNarx) > 1_000_000_000)) e.eskiNarx = 'oldPrice';
  if (f.rasmlar.some((u) => !/^https:\/\/\S+$/.test(u))) e.rasmlar = 'url';
  return e;
}

/** Existing product paths are stable until a compatible category migration exists. */
export class ActiveOrderProductError extends Error {
  constructor() { super('Existing product category is locked'); }
}

/** Update in place. Never move or delete a physical product path. */
export async function saveProduct(f: ProductForm, existing?: Product): Promise<string> {
  if (Object.keys(validateProduct(f)).length) throw new Error('Invalid product form');
  const cat = f.kategoriya.trim();
  if (!cat || [...cat].some((ch) => '.#$[]/'.includes(ch) || ch.charCodeAt(0) < 32 || ch.charCodeAt(0) === 127)) throw new Error('Invalid category');
  if (existing && existing.kategoriya !== cat) throw new ActiveOrderProductError();
  const key = existing && existing.kategoriya === cat ? existing.key : (existing?.key ?? (push(ref(db, `tovarlar/${cat}`)).key as string));
  const opt = (v: string) => (v.trim() ? v.trim() : null);
  const value = {
    nomi: f.nomi.trim(), narxi: int(f.narxi), qoldiq: int(f.qoldiq),
    eskiNarx: f.eskiNarx.trim() ? int(f.eskiNarx) : null,
    birlik: opt(f.birlik), artikul: opt(f.artikul), brend: opt(f.brend), model: opt(f.model), tavsif: opt(f.tavsif),
    rasm: null, rasmlar: f.rasmlar.length ? f.rasmlar : null,
    ommabop: f.ommabop || null, yangi: f.yangi || null, tartib: f.tartib.trim() ? int(f.tartib) || 0 : null,
    revision: (existing?.revision ?? 0) + 1, updatedAt: serverTimestamp(),
  };
  if(usesFirestoreCandidate){const uid=auth.currentUser?.uid;if(!uid)throw new Error('Not authenticated');const {revision: _revision,updatedAt: _updatedAt,...patch}=value;await candidateAck('/v1/admin/product',{cat,id:key,action:existing?'edit':'create',expectedRevision:existing?existing.revision:null,patch},uid);retryCatalog();return `${cat}/${key}`;}
  const writes: Record<string, unknown> = {};
  if (existing && existing.kategoriya === cat) {
    for (const [k, v] of Object.entries(value)) writes[`tovarlar/${cat}/${key}/${k}`] = v;
  } else {
    writes[`tovarlar/${cat}/${key}`] = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null));
  }
  await withTimeout(update(ref(db), writes), 15000);
  return `${cat}/${key}`;
}

export async function deleteProduct(p: Product) {
  if(usesFirestoreCandidate){const uid=auth.currentUser?.uid;if(!uid)throw new Error('Not authenticated');await candidateAck('/v1/admin/product',{cat:p.kategoriya,id:p.key,action:'archive',expectedRevision:p.revision},uid);retryCatalog();return;}
  // Keep the physical record for existing orders and stock releases.
  await withTimeout(update(ref(db, `tovarlar/${p.id}`), { archived: true, revision: p.revision + 1, updatedAt: serverTimestamp() }), 15000);
}

/**
 * Ro'yxatning o'zida narx yoki qoldiqni o'zgartirish. `revision` bazadagidan aynan +1 bo'lishi shart —
 * tovar boshqa joyda o'zgargan bo'lsa, qoidalar rad etadi.
 */
export async function quickUpdate(p: Product, patch: { narxi?: number; qoldiq?: number }) {
  for (const [value, max] of [[patch.narxi, 1_000_000_000], [patch.qoldiq, 1_000_000]] as const) {
    if (value !== undefined && (!Number.isSafeInteger(value) || value < 0 || value > max)) throw new Error('Invalid price or stock');
  }
  if(usesFirestoreCandidate){const uid=auth.currentUser?.uid;if(!uid)throw new Error('Not authenticated');await candidateAck('/v1/admin/product',{cat:p.kategoriya,id:p.key,action:'quick',expectedRevision:p.revision,patch},uid);retryCatalog();return;}
  const value: Record<string, unknown> = { revision: p.revision + 1, updatedAt: serverTimestamp() };
  if (patch.qoldiq !== undefined) value.qoldiq = Math.max(0, Math.floor(patch.qoldiq));
  if (patch.narxi !== undefined) {
    value.narxi = Math.max(0, Math.floor(patch.narxi));
    // Yangi narx eski narxdan katta yoki teng bo'lsa — aksiya tugaydi.
    if (p.eskiNarx && p.eskiNarx <= (value.narxi as number)) value.eskiNarx = null;
  }
  await withTimeout(update(ref(db, `tovarlar/${p.kategoriya}/${p.key}`), value), 10000);
}

export async function saveBanner(b: Omit<Banner, 'id'>, id?: string) {
  const key = id ?? (push(ref(db, 'bannerlar')).key as string);
  if(usesFirestoreCandidate){const uid=auth.currentUser?.uid;if(!uid)throw new Error('Not authenticated');await candidateAck('/v1/admin/banner',{id:key,action:'save',banner:{title:b.title,text:b.text,cta:b.cta,link:b.link,theme:b.theme,order:b.order,active:b.active,...(b.image?{image:b.image}:{}),...(b.art?{art:b.art}:{})}},uid);retryCatalog();return key;}
  await withTimeout(set(ref(db, `bannerlar/${key}`), {
    title: b.title, text: b.text, cta: b.cta, link: b.link, theme: b.theme, order: b.order, active: b.active,
    ...(b.image ? { image: b.image } : {}), ...(b.art ? { art: b.art } : {}),
  }), 15000);
  return key;
}

export async function deleteBanner(id: string) {
  if(usesFirestoreCandidate){const uid=auth.currentUser?.uid;if(!uid)throw new Error('Not authenticated');await candidateAck('/v1/admin/banner',{id,action:'delete'},uid);retryCatalog();return;}
  await withTimeout(remove(ref(db, `bannerlar/${id}`)), 15000);
}

export async function saveSettings(s: ShopSettings) {
  if(usesFirestoreCandidate){const uid=auth.currentUser?.uid;if(!uid)throw new Error('Not authenticated');await candidateAck('/v1/admin/shop',s,uid);retryCatalog();return;}
  // `set` butun tugunni almashtiradi — eski ochiq kalit maydonlari ham shu bilan o'chadi.
  await withTimeout(set(ref(db, 'settings/shop'), {
    ...s,
    lat: s.lat ?? null, lng: s.lng ?? null,
  }), 15000);
}

// ─── Rasm yuklash (ImgBB) ──────────────────────────────────────────────────────
// Kalit `settings/private/imgbbApiKey` da — uni faqat admin o'qiy oladi.

export type MediaKeyState = {
  key: string;
  ready: boolean;
  /** false — qoidalar hali yangilanmagan, kalit vaqtincha eski ochiq joydan o'qilmoqda. */
  secure: boolean;
};

export const mediaStore = createStore<MediaKeyState>({ key: '', ready: false, secure: true });
export const useMediaKey = () => useStore(mediaStore, (s) => s);

/** Admin bo'limi ochiq turganda kalitni kuzatadi. Qaytgan funksiya kuzatishni to'xtatadi. */
export function watchMediaKey(): () => void {
  // No legacy media credentials or external uploads in the synthetic candidate.
  if(usesFirestoreCandidate){mediaStore.set({key:'',ready:true,secure:true});return ()=>{};}
  let offLegacy: (() => void) | null = null;
  const offPrivate = onValue(ref(db, 'settings/private/imgbbApiKey'), (snap) => {
    offLegacy?.();
    offLegacy = null;
    mediaStore.set({ key: readMediaKey(snap.val()), ready: true, secure: true });
  }, () => {
    // Yangi qoidalar hali joylanmagan: yuklash to'xtab qolmasligi uchun eski joydan o'qiymiz.
    offLegacy = onValue(ref(db, 'settings/shop/imgbbApiKey'),
      (snap) => mediaStore.set({ key: readMediaKey(snap.val()), ready: true, secure: false }),
      () => mediaStore.set({ key: '', ready: true, secure: false }));
  });
  return () => { offPrivate(); offLegacy?.(); };
}

export async function saveMediaKey(key: string) {
  if(usesFirestoreCandidate)throw new Error('Media upload disabled in synthetic candidate');
  const clean = key.trim();
  await withTimeout(set(ref(db, 'settings/private/imgbbApiKey'), clean ? clean : null), 15000);
}

/**
 * Bir martalik ko'chirish: kalit hamma o'qiy oladigan `settings/shop` da qolgan bo'lsa,
 * uni `settings/private` ga o'tkazadi va ochiq joydan o'chiradi (bitta atomar yozuvda).
 * Yangi qoidalar joylanmagan bo'lsa, hech narsa o'zgarmaydi.
 */
export async function migrateMediaKey(): Promise<'moved' | 'nothing'> {
  if(usesFirestoreCandidate)return 'nothing';
  const shop = (await withTimeout(get(ref(db, 'settings/shop')), 15000)).val() as Record<string, unknown> | null;
  const legacy = LEGACY_PUBLIC_MEDIA_FIELDS.filter((k) => shop && k in shop);
  if (!shop || !legacy.length) return 'nothing';
  const current = readMediaKey((await withTimeout(get(ref(db, 'settings/private/imgbbApiKey')), 15000)).val());
  const writes: Record<string, unknown> = {};
  const old = readMediaKey(shop.imgbbApiKey);
  if (!current && old) writes['settings/private/imgbbApiKey'] = old;
  for (const k of legacy) writes[`settings/shop/${k}`] = null;
  await withTimeout(update(ref(db), writes), 15000);
  return 'moved';
}

export class UploadError extends Error {
  constructor(public kind: 'badKey' | 'tooBig' | 'network' | 'server', message: string) {
    super(message);
  }
}

export const MAX_UPLOAD_BYTES = 32 * 1024 * 1024;

/**
 * Rasmni ImgBB ga yuklaydi va https havolani qaytaradi.
 * `image` — brauzerda File/Blob, telefonda base64 matn (RN FormData Blob'ni ImgBB ga to'g'ri yubormaydi).
 */
export async function uploadToImgbb(image: Blob | string, key: string): Promise<string> {
  if (!key.trim()) throw new UploadError('badKey', 'Missing upload key');
  const bytes = typeof image === 'string'
    ? Math.floor(image.length * 3 / 4) - (image.endsWith('==') ? 2 : image.endsWith('=') ? 1 : 0)
    : image.size;
  if (bytes > MAX_UPLOAD_BYTES) throw new UploadError('tooBig', 'too big');
  if (bytes <= 0) throw new UploadError('server', 'Empty image');
  const body = new FormData();
  body.append('image', image);
  body.append('key', key.trim());
  let res: Response;
  let json: { data?: { url?: string }; error?: { message?: string; code?: number } };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  try {
    ({ res, json } = await withTimeout((async () => {
      const response = await fetch('https://api.imgbb.com/1/upload', { method: 'POST', body, signal: controller.signal });
      const payload = await response.json().catch(() => ({}));
      return { res: response, json: payload };
    })(), 90000));
  } catch {
    controller.abort();
    throw new UploadError('network', 'Image upload failed');
  } finally {
    clearTimeout(timer);
  }
  const url = json?.data?.url;
  if (res.ok && typeof url === 'string' && /^https:\/\/\S+$/.test(url)) return url;
  const message = typeof json?.error?.message === 'string' ? json.error.message : `HTTP ${res.status}`;
  if (/key/i.test(message) || res.status === 401 || res.status === 403) throw new UploadError('badKey', message);
  if (res.status === 413 || /size|large/i.test(message)) throw new UploadError('tooBig', message);
  throw new UploadError('server', message);
}

export async function loadCandidateAdminBanners(uid:string){
 const result=await candidateRequest<{banners:unknown}>('/v1/admin/banners/list',{},uid);
 if(!result.banners||typeof result.banners!=='object'||Array.isArray(result.banners))throw new Error('Invalid banner response');
 const banners=readBanners(result.banners,true);
 if(banners.length!==Object.keys(result.banners).length||auth.currentUser?.uid!==uid)throw new Error('Invalid banner response');
 return banners;
}
