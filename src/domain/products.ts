import { compactCode, fold, tokens } from './text.ts';
import { categoryFor, CAR_MODELS, parseModels } from './taxonomy.ts';

export type Product = {
  /** `${kategoriya}/${key}` — bazadagi yo'l bilan bir xil. */
  id: string;
  kategoriya: string;
  key: string;
  nomi: string;
  narxi: number;
  eskiNarx?: number;
  qoldiq: number;
  rasmlar: string[];
  tavsif?: string;
  artikul?: string;
  brend?: string;
  model?: string;
  modellar: string[];
  universal: boolean;
  birlik?: string;
  ommabop: boolean;
  yangi: boolean;
  tartib: number;
  revision: number;
  updatedAt: number;
  /** Qidiruv uchun tayyorlangan matn. */
  hay: string;
  code: string;
};

export const KEY_PATTERN = /^[^.#$[\]/\u0000-\u001f]{1,100}$/;
export const LOW_STOCK = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function str(value: unknown, max = 5000): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : undefined;
}
function https(value: unknown): string | undefined {
  return typeof value === 'string' && /^https:\/\/\S+$/.test(value.trim()) ? value.trim() : undefined;
}

export function readProduct(kategoriya: string, key: string, p: unknown): Product | null {
  if (!isRecord(p) || !KEY_PATTERN.test(kategoriya) || !KEY_PATTERN.test(key)) return null;
  const nomi = str(p.nomi, 160);
  if (!nomi || typeof p.narxi !== 'number' || !Number.isFinite(p.narxi) || p.narxi < 0) return null;
  if (typeof p.qoldiq !== 'number' || !Number.isFinite(p.qoldiq)) return null;
  const narxi = Math.round(p.narxi);
  const images: string[] = [];
  const pushImage = (v: unknown) => { const u = https(v); if (u && !images.includes(u) && images.length < 10) images.push(u); };
  pushImage(p.rasm);
  if (Array.isArray(p.rasmlar)) p.rasmlar.forEach(pushImage);
  else if (isRecord(p.rasmlar)) Object.keys(p.rasmlar).sort().forEach((k) => pushImage((p.rasmlar as Record<string, unknown>)[k]));
  const model = str(p.model, 300);
  const parsed = parseModels(model);
  const artikul = str(p.artikul, 80);
  const brend = str(p.brend, 60);
  const eski = typeof p.eskiNarx === 'number' && Number.isFinite(p.eskiNarx) && p.eskiNarx > narxi ? Math.round(p.eskiNarx) : undefined;
  const cat = categoryFor(kategoriya);
  const modelNames = parsed.slugs.map((s) => CAR_MODELS.find((m) => m.slug === s)?.name ?? '').join(' ');
  return {
    id: `${kategoriya}/${key}`,
    kategoriya,
    key,
    nomi,
    narxi,
    eskiNarx: eski,
    qoldiq: Math.max(0, Math.floor(p.qoldiq)),
    rasmlar: images,
    tavsif: str(p.tavsif),
    artikul,
    brend,
    model,
    modellar: parsed.slugs,
    universal: parsed.universal,
    birlik: str(p.birlik, 20),
    ommabop: p.ommabop === true,
    yangi: p.yangi === true,
    tartib: typeof p.tartib === 'number' && Number.isFinite(p.tartib) ? p.tartib : 0,
    revision: typeof p.revision === 'number' ? p.revision : 0,
    updatedAt: typeof p.updatedAt === 'number' ? p.updatedAt : 0,
    hay: fold([nomi, artikul, brend, model, modelNames, kategoriya, cat?.label.uz, cat?.label.ru].filter(Boolean).join(' ')),
    code: artikul ? compactCode(artikul) : '',
  };
}

/** `tovarlar/{kategoriya}/{id}` tuzilmasini o'qiydi. Noto'g'ri yozuvlar tashlab yuboriladi. */
export function readProducts(value: unknown): Product[] {
  if (!isRecord(value)) return [];
  const out: Product[] = [];
  for (const [kategoriya, entries] of Object.entries(value)) {
    if (!isRecord(entries)) continue;
    for (const [key, p] of Object.entries(entries)) {
      const product = readProduct(kategoriya, key, p);
      if (product) out.push(product);
    }
  }
  return out.sort(defaultOrder);
}

export function defaultOrder(a: Product, b: Product): number {
  return (b.tartib - a.tartib) || (Number(b.qoldiq > 0) - Number(a.qoldiq > 0)) || (Number(b.ommabop) - Number(a.ommabop)) || a.nomi.localeCompare(b.nomi);
}

/** Telefonda saqlangan katalog — faqat ko'rsatish uchun, xuddi jonli katalogdek tekshiriladi. */
export function readCachedProducts(value: unknown): Product[] {
  if (!Array.isArray(value) || value.length > 20000) return [];
  const out: Product[] = [];
  for (const raw of value) {
    if (!isRecord(raw) || typeof raw.id !== 'string') continue;
    const [kategoriya, key, extra] = raw.id.split('/');
    if (!kategoriya || !key || extra !== undefined) continue;
    const p = readProduct(kategoriya, key, { ...raw, rasmlar: raw.rasmlar });
    if (p) out.push(p);
  }
  return out.sort(defaultOrder);
}

export function toCache(products: Product[]) {
  return products.map((p) => ({
    id: p.id, nomi: p.nomi, narxi: p.narxi, eskiNarx: p.eskiNarx, qoldiq: p.qoldiq, rasmlar: p.rasmlar, tavsif: p.tavsif,
    artikul: p.artikul, brend: p.brend, model: p.model, birlik: p.birlik, ommabop: p.ommabop, yangi: p.yangi, tartib: p.tartib,
    revision: p.revision, updatedAt: p.updatedAt,
  }));
}

export function discountPercent(p: Pick<Product, 'narxi' | 'eskiNarx'>): number {
  if (!p.eskiNarx || p.eskiNarx <= p.narxi) return 0;
  return Math.max(1, Math.round((1 - p.narxi / p.eskiNarx) * 100));
}

export function fitsModel(p: Product, slug: string | null | undefined): boolean {
  if (!slug) return true;
  return p.universal || p.modellar.includes(slug);
}

export type SortKey = 'popular' | 'cheap' | 'expensive' | 'new' | 'discount';
export type Filters = {
  query?: string;
  category?: string | null;
  group?: 'parts' | 'accessories' | null;
  model?: string | null;
  inStock?: boolean;
  sale?: boolean;
  newOnly?: boolean;
  popularOnly?: boolean;
  minPrice?: number | null;
  maxPrice?: number | null;
  sort?: SortKey;
};

/** Qidiruv balli: 0 — mos emas. Artikul to'liq mos kelsa eng yuqori. */
export function searchScore(p: Product, query: string): number {
  const words = tokens(query);
  if (!words.length) return 1;
  const code = compactCode(query);
  if (code.length >= 4 && p.code && (p.code === code || p.code.includes(code))) return 100;
  let score = 0;
  const name = fold(p.nomi);
  for (const w of words) {
    if (!p.hay.includes(w)) {
      // Bitta harf xatosiga chidamli: uzun so'zlarda oxirgi harfsiz moslik.
      if (w.length >= 5 && p.hay.includes(w.slice(0, -1))) { score += 1; continue; }
      return 0;
    }
    score += name.startsWith(w) ? 6 : (` ${name}`).includes(` ${w}`) ? 4 : 2;
  }
  return score;
}

export function applyFilters(products: Product[], f: Filters): Product[] {
  const q = f.query?.trim() ?? '';
  const scored: { p: Product; s: number }[] = [];
  for (const p of products) {
    if (f.category && p.kategoriya !== f.category) continue;
    if (f.group && (categoryFor(p.kategoriya)?.group ?? 'parts') !== f.group) continue;
    if (f.model && !fitsModel(p, f.model)) continue;
    if (f.inStock && p.qoldiq <= 0) continue;
    if (f.sale && !discountPercent(p)) continue;
    if (f.newOnly && !p.yangi) continue;
    if (f.popularOnly && !p.ommabop) continue;
    if (f.minPrice != null && p.narxi < f.minPrice) continue;
    if (f.maxPrice != null && p.narxi > f.maxPrice) continue;
    const s = q ? searchScore(p, q) : 1;
    if (s > 0) scored.push({ p, s });
  }
  const sort = f.sort ?? 'popular';
  scored.sort((a, b) => {
    if (sort === 'cheap') return a.p.narxi - b.p.narxi;
    if (sort === 'expensive') return b.p.narxi - a.p.narxi;
    if (sort === 'new') return (Number(b.p.yangi) - Number(a.p.yangi)) || (b.p.updatedAt - a.p.updatedAt) || defaultOrder(a.p, b.p);
    if (sort === 'discount') return discountPercent(b.p) - discountPercent(a.p) || defaultOrder(a.p, b.p);
    return (q ? b.s - a.s : 0) || defaultOrder(a.p, b.p);
  });
  return scored.map((x) => x.p);
}

export function similarProducts(all: Product[], p: Product, limit = 10): Product[] {
  return all
    .filter((x) => x.id !== p.id && x.qoldiq > 0 && (x.kategoriya === p.kategoriya || x.modellar.some((m) => p.modellar.includes(m))))
    .map((x) => ({ x, s: (x.kategoriya === p.kategoriya ? 2 : 0) + x.modellar.filter((m) => p.modellar.includes(m)).length }))
    .sort((a, b) => b.s - a.s || defaultOrder(a.x, b.x))
    .slice(0, limit)
    .map((v) => v.x);
}

/** Admin tomonidan kiritilmagan bo'lsa ham, katalogdagi namuna yozuvlarni (Mahsulot 1) aniqlash. */
export function isPlaceholderCatalog(products: Product[]): boolean {
  return products.length > 0 && products.every((p) => /^kategoriya_\d+$/.test(p.kategoriya) && /^mahsulot \d+$/i.test(p.nomi));
}
