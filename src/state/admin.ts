import { push, ref, remove, serverTimestamp, set, update } from 'firebase/database';

import type { Banner, ShopSettings } from '../domain/content';
import type { Product } from '../domain/products';
import { db, withTimeout } from '../lib/firebase';

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

const int = (s: string) => (/^\d{1,10}$/.test(s.replace(/\s/g, '')) ? parseInt(s.replace(/\s/g, ''), 10) : NaN);

export function validateProduct(f: ProductForm): Partial<Record<keyof ProductForm, string>> {
  const e: Partial<Record<keyof ProductForm, string>> = {};
  if (f.nomi.trim().length < 2) e.nomi = 'name';
  if (!Number.isSafeInteger(int(f.narxi))) e.narxi = 'price';
  if (!Number.isSafeInteger(int(f.qoldiq))) e.qoldiq = 'stock';
  if (f.eskiNarx.trim() && !(int(f.eskiNarx) > int(f.narxi))) e.eskiNarx = 'oldPrice';
  if (f.rasmlar.some((u) => !/^https:\/\/\S+$/.test(u))) e.rasmlar = 'url';
  return e;
}

/** Tovarni saqlaydi. Kategoriya o'zgarsa — eski yo'l o'chiriladi (bitta atomar yozuvda). */
export async function saveProduct(f: ProductForm, existing?: Product): Promise<string> {
  const cat = f.kategoriya.trim();
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
  const writes: Record<string, unknown> = {};
  if (existing && existing.kategoriya !== cat) writes[`tovarlar/${existing.kategoriya}/${existing.key}`] = null;
  if (existing && existing.kategoriya === cat) {
    for (const [k, v] of Object.entries(value)) writes[`tovarlar/${cat}/${key}/${k}`] = v;
  } else {
    writes[`tovarlar/${cat}/${key}`] = Object.fromEntries(Object.entries(value).filter(([, v]) => v !== null));
  }
  await withTimeout(update(ref(db), writes), 15000);
  return `${cat}/${key}`;
}

export async function deleteProduct(p: Product) {
  await withTimeout(remove(ref(db, `tovarlar/${p.kategoriya}/${p.key}`)), 15000);
}

export async function quickStock(p: Product, qoldiq: number) {
  await withTimeout(update(ref(db, `tovarlar/${p.kategoriya}/${p.key}`), { qoldiq: Math.max(0, Math.floor(qoldiq)), revision: p.revision + 1, updatedAt: serverTimestamp() }), 10000);
}

export async function saveBanner(b: Omit<Banner, 'id'>, id?: string) {
  const key = id ?? (push(ref(db, 'bannerlar')).key as string);
  await withTimeout(set(ref(db, `bannerlar/${key}`), {
    title: b.title, text: b.text, cta: b.cta, link: b.link, theme: b.theme, order: b.order, active: b.active,
    ...(b.image ? { image: b.image } : {}), ...(b.art ? { art: b.art } : {}),
  }), 15000);
  return key;
}

export async function deleteBanner(id: string) {
  await withTimeout(remove(ref(db, `bannerlar/${id}`)), 15000);
}

export async function saveSettings(s: ShopSettings) {
  await withTimeout(set(ref(db, 'settings/shop'), {
    ...s,
    lat: s.lat ?? null, lng: s.lng ?? null,
  }), 15000);
}

/** Cloudinary yoki ImgBB orqali rasmni yuklaydi va HTTPS havolani qaytaradi. */
export async function uploadImage(uri: string, cloudOrKey: string, preset?: string): Promise<string> {
  // Agar preset bo'lsa - Cloudinary, yo'q bo'lsa - ImgBB
  if (preset) {
    // Cloudinary
    const body = new FormData();
    const name = `n99-${Date.now()}.jpg`;
    body.append('file', { uri, name, type: 'image/jpeg' } as unknown as Blob);
    body.append('upload_preset', preset);
    body.append('folder', 'n99');
    const res = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudOrKey)}/image/upload`, { method: 'POST', body });
    const json = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
    if (!res.ok || !json.secure_url) throw new Error(json.error?.message ?? `upload ${res.status}`);
    return json.secure_url.replace('/upload/', '/upload/f_auto,q_auto,w_1200/');
  } else {
    // ImgBB
    const body = new FormData();
    const name = `n99-${Date.now()}.jpg`;
    body.append('image', { uri, name, type: 'image/jpeg' } as unknown as Blob);
    const res = await fetch(`https://api.imgbb.com/1/upload?key=${encodeURIComponent(cloudOrKey)}`, { method: 'POST', body });
    const json = (await res.json().catch(() => ({}))) as { data?: { url?: string }; error?: { message?: string } };
    if (!res.ok || !json.data?.url) throw new Error(json.error?.message ?? `upload ${res.status}`);
    return json.data.url;
  }
}
