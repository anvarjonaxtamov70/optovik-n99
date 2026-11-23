import { discountPercent, fitsModel, type Product } from './products.ts';
import { categoryFor, type Localized } from './taxonomy.ts';

export type BannerTheme = 'brand' | 'night' | 'sky' | 'sunrise' | 'mint';
export const BANNER_THEMES: BannerTheme[] = ['brand', 'night', 'sky', 'sunrise', 'mint'];

/**
 * Havola turlari: `sale` | `new` | `popular` | `catalog` | `contact` | `delivery` | `group:parts|accessories`
 * | `cat:<kategoriya>` | `model:<slug>` | `search:<matn>` | `product:<kat>/<id>` | `https://...`
 */
export type Banner = {
  id: string;
  title: Localized;
  text: Localized;
  cta: Localized;
  link: string;
  theme: BannerTheme;
  image?: string;
  art?: 'gm' | 'accessories' | 'sale' | 'delivery' | 'cash';
  order: number;
  active: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
function loc(v: unknown, max: number): Localized | null {
  if (typeof v === 'string' && v.trim()) return { uz: v.trim().slice(0, max), ru: v.trim().slice(0, max) };
  if (!isRecord(v)) return null;
  const uz = typeof v.uz === 'string' ? v.uz.trim().slice(0, max) : '';
  const ru = typeof v.ru === 'string' ? v.ru.trim().slice(0, max) : '';
  if (!uz && !ru) return null;
  return { uz: uz || ru, ru: ru || uz };
}

export function isSafeLink(link: string): boolean {
  return /^(sale|new|popular|catalog|contact|delivery)$/.test(link)
    || /^group:(parts|accessories)$/.test(link)
    || /^(cat|model|search):[^\s]{1,80}$/.test(link)
    || /^product:[^/\s]{1,100}\/[^/\s]{1,100}$/.test(link)
    || /^https:\/\/\S{4,500}$/.test(link);
}

export function readBanners(value: unknown): Banner[] {
  if (!isRecord(value)) return [];
  const out: Banner[] = [];
  for (const [id, b] of Object.entries(value)) {
    if (!isRecord(b)) continue;
    const title = loc(b.title, 60);
    if (!title) continue;
    const link = typeof b.link === 'string' && isSafeLink(b.link) ? b.link : 'catalog';
    out.push({
      id,
      title,
      text: loc(b.text, 120) ?? { uz: '', ru: '' },
      cta: loc(b.cta, 30) ?? { uz: 'Ko‘rish', ru: 'Смотреть' },
      link,
      theme: BANNER_THEMES.includes(b.theme as BannerTheme) ? (b.theme as BannerTheme) : 'brand',
      image: typeof b.image === 'string' && /^https:\/\/\S+$/.test(b.image) ? b.image : undefined,
      art: ['gm', 'accessories', 'sale', 'delivery', 'cash'].includes(b.art as string) ? (b.art as Banner['art']) : undefined,
      order: typeof b.order === 'number' ? b.order : 0,
      active: b.active !== false,
    });
  }
  return out.filter((b) => b.active).sort((a, b) => a.order - b.order);
}

/**
 * Banner bosilganda ochiladigan ro'yxatda tovar bormi. Bo'sh javonni reklama qilmaymiz: masalan, aksessuar
 * yo'q bo'lsa «Avto aksessuarlar» banneri ko'rinmaydi (bosilsa bo'sh sahifa ochilardi).
 * Ro'yxat bilan bog'liq bo'lmagan havolalar (aloqa, yetkazish, sayt) har doim ko'rinadi.
 */
export function bannerHasContent(link: string, products: Product[]): boolean {
  if (link === 'sale') return products.some((p) => discountPercent(p) > 0);
  if (link === 'new') return products.some((p) => p.yangi);
  if (link === 'popular') return products.some((p) => p.ommabop);
  const i = link.indexOf(':');
  if (i < 0 || link.startsWith('https:')) return true;
  const kind = link.slice(0, i);
  const value = link.slice(i + 1);
  if (kind === 'group') return products.some((p) => (categoryFor(p.kategoriya)?.group ?? 'parts') === value);
  if (kind === 'cat') return products.some((p) => p.kategoriya === value);
  if (kind === 'model') return products.some((p) => fitsModel(p, value));
  if (kind === 'product') return products.some((p) => p.id === value);
  return true;
}

/** Admin hali banner qo'shmagan bo'lsa ko'rsatiladigan tayyor bannerlar. */
export const DEFAULT_BANNERS: Banner[] = [
  {
    id: 'd-gm', theme: 'brand', art: 'gm', link: 'group:parts', order: 0, active: true,
    title: { uz: 'GM ehtiyot\nqismlari', ru: 'Запчасти\nдля GM' },
    text: { uz: 'Cobalt, Nexia, Gentra, Spark va boshqalar', ru: 'Cobalt, Nexia, Gentra, Spark и другие' },
    cta: { uz: 'Katalog', ru: 'Каталог' },
  },
  {
    id: 'd-sale', theme: 'sunrise', art: 'sale', link: 'sale', order: 1, active: true,
    title: { uz: 'Aksiyadagi\ntovarlar', ru: 'Товары\nпо акции' },
    text: { uz: 'Eski narxdan arzon — chegirmalar har hafta', ru: 'Дешевле прежней цены — скидки каждую неделю' },
    cta: { uz: 'Aksiyalar', ru: 'Акции' },
  },
  {
    id: 'd-acc', theme: 'sky', art: 'accessories', link: 'group:accessories', order: 2, active: true,
    title: { uz: 'Avto\naksessuarlar', ru: 'Авто-\nаксессуары' },
    text: { uz: 'Registrator, gilam, telefon tutqichi', ru: 'Регистратор, коврики, держатели' },
    cta: { uz: 'Tanlash', ru: 'Выбрать' },
  },
  {
    id: 'd-cash', theme: 'night', art: 'cash', link: 'delivery', order: 3, active: true,
    title: { uz: 'Naqd to‘lov,\ntez yetkazish', ru: 'Оплата наличными,\nбыстрая доставка' },
    text: { uz: 'Samarqand bo‘ylab yoki do‘kondan olib keting', ru: 'По Самарканду или самовывоз из магазина' },
    cta: { uz: 'Batafsil', ru: 'Подробнее' },
  },
];

export type ShopSettings = {
  name: string;
  phone: string;
  phone2: string;
  telegram: string;
  instagram: string;
  address: string;
  landmark: string;
  workHours: string;
  lat: number | null;
  lng: number | null;
  courierEnabled: boolean;
  courierFee: number;
  freeDeliveryFrom: number;
  pickupEnabled: boolean;
  deliveryNote: string;
  /** Sotuvchi (MChJ) rekvizitlari — ommaviy oferta va to'lov cheki uchun. */
  legalName: string;
  inn: string;
  legalAddress: string;
  director: string;
  bankName: string;
  /** Hisob raqami: 20 raqam. */
  bankAccount: string;
  /** Bank MFO kodi: 5 raqam. */
  bankMfo: string;
  email: string;
  /** Chek uchun: tovarning MXIK (IKPU) kodi — 17 raqam (hozircha barcha tovarlar uchun bitta). */
  mxik: string;
  /** Chek uchun: o'lchov birligi (qadoq) kodi, masalan «dona». */
  packageCode: string;
  /** Chekdagi QQS foizi: aylanmadan olinadigan soliq to'lovchisi uchun 0. */
  vatPercent: number;
};

/** Hamma o'qiy oladigan `settings/shop` ga tushmasligi kerak bo'lgan eski maydonlar (kalitlar endi `settings/private` da). */
export const LEGACY_PUBLIC_MEDIA_FIELDS = ['imgbbApiKey', 'cloudinaryCloud', 'cloudinaryPreset'] as const;

/** ImgBB API kaliti: faqat harf va raqam, 100 belgigacha. */
export function readMediaKey(value: unknown): string {
  return typeof value === 'string' && /^[A-Za-z0-9]{8,100}$/.test(value.trim()) ? value.trim() : '';
}

export const DEFAULT_SETTINGS: ShopSettings = {
  name: 'OPTOVIK N99',
  phone: '',
  phone2: '',
  telegram: '',
  instagram: '',
  address: 'Yangi Samarqand zapchast bozori, 19-sektor, 2-do‘kon',
  landmark: '',
  workHours: '08:00 – 18:00',
  lat: null,
  lng: null,
  courierEnabled: true,
  courierFee: 0,
  freeDeliveryFrom: 0,
  pickupEnabled: true,
  deliveryNote: '',
  legalName: '',
  inn: '',
  legalAddress: '',
  director: '',
  bankName: '',
  bankAccount: '',
  bankMfo: '',
  email: '',
  mxik: '',
  packageCode: '',
  vatPercent: 0,
};

export function readSettings(value: unknown): ShopSettings {
  if (!isRecord(value)) return DEFAULT_SETTINGS;
  const s = (k: keyof ShopSettings, max = 300) => (typeof value[k] === 'string' ? (value[k] as string).trim().slice(0, max) : (DEFAULT_SETTINGS[k] as string));
  const money = (k: keyof ShopSettings) => (typeof value[k] === 'number' && Number.isSafeInteger(value[k]) && (value[k] as number) >= 0 ? (value[k] as number) : (DEFAULT_SETTINGS[k] as number));
  const coord = (k: 'lat' | 'lng') => (typeof value[k] === 'number' && Number.isFinite(value[k]) ? (value[k] as number) : null);
  return {
    name: s('name', 60) || DEFAULT_SETTINGS.name,
    phone: s('phone', 20), phone2: s('phone2', 20), telegram: s('telegram', 60), instagram: s('instagram', 60),
    address: s('address') || DEFAULT_SETTINGS.address, landmark: s('landmark'), workHours: s('workHours', 60),
    lat: coord('lat'), lng: coord('lng'),
    courierEnabled: value.courierEnabled !== false,
    courierFee: money('courierFee'), freeDeliveryFrom: money('freeDeliveryFrom'),
    pickupEnabled: value.pickupEnabled !== false,
    deliveryNote: s('deliveryNote', 300), legalName: s('legalName', 120), inn: s('inn', 20),
    legalAddress: s('legalAddress', 300), director: s('director', 120), bankName: s('bankName', 160),
    bankAccount: s('bankAccount', 20), bankMfo: s('bankMfo', 5), email: s('email', 120),
    mxik: s('mxik', 17), packageCode: s('packageCode', 10),
    vatPercent: typeof value.vatPercent === 'number' && Number.isInteger(value.vatPercent) && value.vatPercent >= 0 && value.vatPercent <= 30 ? value.vatPercent : 0,
  };
}

export type LegalField = 'inn' | 'bankAccount' | 'bankMfo' | 'email' | 'mxik' | 'packageCode' | 'vatPercent';

/**
 * Rekvizitlar shakli tekshiruvi (admin sozlamalarida). Bo'sh maydon xato emas — faqat noto'g'ri to'ldirilgani.
 * Qoidalar (database.rules.json) xuddi shu shakllarni server tomonda ham tekshiradi.
 */
export function legalErrors(s: Pick<ShopSettings, LegalField>): Partial<Record<LegalField, true>> {
  const e: Partial<Record<LegalField, true>> = {};
  const bad = (v: string, re: RegExp) => v !== '' && !re.test(v);
  // MChJ uchun 9 raqam; yakka tadbirkorda JSHSHIR — 14 raqam.
  if (bad(s.inn, /^(\d{9}|\d{14})$/)) e.inn = true;
  if (bad(s.bankAccount, /^\d{20}$/)) e.bankAccount = true;
  if (bad(s.bankMfo, /^\d{5}$/)) e.bankMfo = true;
  if (bad(s.email, /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/)) e.email = true;
  if (bad(s.mxik, /^\d{17}$/)) e.mxik = true;
  if (bad(s.packageCode, /^\d{1,10}$/)) e.packageCode = true;
  if (!Number.isInteger(s.vatPercent) || s.vatPercent < 0 || s.vatPercent > 30) e.vatPercent = true;
  return e;
}
