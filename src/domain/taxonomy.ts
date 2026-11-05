import { fold } from './text.ts';

export type Localized = { uz: string; ru: string };

export type CarModel = {
  slug: string;
  name: string;
  /** Matnda qidiriladigan nomlar (fold qilingan). Uzunlari oldin tekshiriladi. */
  aliases: string[];
  body: 'sedan' | 'hatch' | 'suv' | 'van' | 'pickup';
  years?: string;
};

// O'zbekistonda eng ko'p uchraydigan GM / Chevrolet / Daewoo modellari.
export const CAR_MODELS: CarModel[] = [
  { slug: 'cobalt', name: 'Cobalt', aliases: ['cobalt', 'kobalt'], body: 'sedan', years: '2012+' },
  { slug: 'nexia3', name: 'Nexia 3', aliases: ['nexia 3', 'nexia3', 'neksia 3', 'neksiya 3', 'nexia r3'], body: 'sedan', years: '2016+' },
  { slug: 'nexia2', name: 'Nexia 2', aliases: ['nexia 2', 'nexia2', 'neksia 2', 'neksiya 2', 'nexia', 'neksiya', 'neksia'], body: 'sedan', years: '2008–2016' },
  { slug: 'gentra', name: 'Gentra', aliases: ['gentra', 'djentra', 'jentra'], body: 'sedan', years: '2013+' },
  { slug: 'lacetti', name: 'Lacetti', aliases: ['lacetti', 'laketti', 'lachetti'], body: 'sedan', years: '2004–2013' },
  { slug: 'spark', name: 'Spark', aliases: ['spark'], body: 'hatch', years: '2010+' },
  { slug: 'matiz', name: 'Matiz', aliases: ['matiz', 'matis'], body: 'hatch' },
  { slug: 'damas', name: 'Damas', aliases: ['damas'], body: 'van' },
  { slug: 'labo', name: 'Labo', aliases: ['labo'], body: 'pickup' },
  { slug: 'onix', name: 'Onix', aliases: ['onix', 'oniks'], body: 'sedan', years: '2023+' },
  { slug: 'tracker', name: 'Tracker', aliases: ['tracker', 'treker', 'traker'], body: 'suv', years: '2021+' },
  { slug: 'malibu', name: 'Malibu', aliases: ['malibu'], body: 'sedan' },
  { slug: 'captiva', name: 'Captiva', aliases: ['captiva', 'kaptiva'], body: 'suv' },
  { slug: 'equinox', name: 'Equinox', aliases: ['equinox', 'ekvinoks'], body: 'suv' },
  { slug: 'epica', name: 'Epica', aliases: ['epica', 'epika'], body: 'sedan' },
  { slug: 'orlando', name: 'Orlando', aliases: ['orlando'], body: 'suv' },
  { slug: 'tahoe', name: 'Tahoe', aliases: ['tahoe'], body: 'suv' },
];

const UNIVERSAL = ['universal', 'universalniy', 'barcha', 'hamma', 'vse', 'lyuboy'];
const MODEL_BY_SLUG = new Map(CAR_MODELS.map((m) => [m.slug, m]));
const SORTED_ALIASES = CAR_MODELS.flatMap((m) => m.aliases.map((a) => ({ slug: m.slug, alias: fold(a) })))
  .sort((a, b) => b.alias.length - a.alias.length);

export function modelBySlug(slug: string | null | undefined): CarModel | undefined {
  return slug ? MODEL_BY_SLUG.get(slug) : undefined;
}

/** "Cobalt, Gentra / Lacetti" → ['cobalt','gentra','lacetti']; "Universal" → universal: true. */
export function parseModels(text: string | undefined): { slugs: string[]; universal: boolean } {
  if (!text) return { slugs: [], universal: false };
  let rest = ` ${fold(text).replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
  const found: { slug: string; at: number }[] = [];
  for (const { slug, alias } of SORTED_ALIASES) {
    const needle = ` ${alias} `;
    const at = rest.indexOf(needle);
    if (at >= 0) {
      if (!found.some((f) => f.slug === slug)) found.push({ slug, at });
      // Topilgan nomni bir xil uzunlikdagi bo'shliq bilan almashtiramiz — boshqa nomlarning o'rni siljimaydi.
      rest = rest.split(needle).join(' '.repeat(needle.length));
    }
  }
  const slugs = found.sort((a, b) => a.at - b.at).map((f) => f.slug);
  const universal = UNIVERSAL.some((u) => rest.includes(` ${u}`));
  return { slugs, universal };
}

export type Category = {
  slug: string;
  label: Localized;
  icon: string;
  group: 'parts' | 'accessories';
  aliases: string[];
};

export const CATEGORIES: Category[] = [
  { slug: 'dvigatel', label: { uz: 'Dvigatel', ru: 'Двигатель' }, icon: 'engine', group: 'parts', aliases: ['dvigatel', 'motor', 'engine', 'dvigatel qismlari'] },
  { slug: 'filtrlar', label: { uz: 'Filtrlar', ru: 'Фильтры' }, icon: 'air-filter', group: 'parts', aliases: ['filtr', 'filtrlar', 'filter', 'filtri'] },
  { slug: 'moylar', label: { uz: 'Moy va suyuqliklar', ru: 'Масла и жидкости' }, icon: 'oil', group: 'parts', aliases: ['moy', 'moylar', 'maslo', 'masla', 'suyuqlik', 'antifriz'] },
  { slug: 'tormoz', label: { uz: 'Tormoz tizimi', ru: 'Тормозная система' }, icon: 'car-brake-abs', group: 'parts', aliases: ['tormoz', 'tormoz tizimi', 'brake'] },
  { slug: 'hodovoy', label: { uz: 'Osma (hodovoy)', ru: 'Подвеска' }, icon: 'car-traction-control', group: 'parts', aliases: ['hodovoy', 'hodovaya', 'osma', 'podveska', 'amortizator', 'rul'] },
  { slug: 'elektrika', label: { uz: 'Elektrika', ru: 'Электрика' }, icon: 'car-battery', group: 'parts', aliases: ['elektrika', 'elektr', 'akkumulyator', 'svecha', 'datchik'] },
  { slug: 'optika', label: { uz: 'Fara va chiroqlar', ru: 'Оптика' }, icon: 'car-light-high', group: 'parts', aliases: ['optika', 'fara', 'faralar', 'chiroq', 'lampa'] },
  { slug: 'sovutish', label: { uz: 'Sovutish tizimi', ru: 'Охлаждение' }, icon: 'radiator', group: 'parts', aliases: ['sovutish', 'radiator', 'ohlajdenie', 'pompa', 'termostat'] },
  { slug: 'transmissiya', label: { uz: 'Transmissiya', ru: 'Трансмиссия' }, icon: 'car-shift-pattern', group: 'parts', aliases: ['transmissiya', 'korobka', 'sseplenie', 'stseplenie', 'graneta', 'privod'] },
  { slug: 'kuzov', label: { uz: 'Kuzov qismlari', ru: 'Кузовные детали' }, icon: 'car-door', group: 'parts', aliases: ['kuzov', 'bamper', 'oyna', 'zerkalo', 'kapot'] },
  { slug: 'salon', label: { uz: 'Salon', ru: 'Салон' }, icon: 'car-seat', group: 'accessories', aliases: ['salon', 'chehol', 'gilam', 'kovrik', 'chexol'] },
  { slug: 'aksessuarlar', label: { uz: 'Aksessuarlar', ru: 'Аксессуары' }, icon: 'cellphone-link', group: 'accessories', aliases: ['aksessuar', 'aksessuarlar', 'akssesuar', 'aksessuary', 'accessories', 'registrator', 'tutqich', 'derjatel'] },
];

const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]));

/** Bazadagi kategoriya kalitini (masalan `motor`, `Aksessuarlar`) taksonomiyaga bog'laydi. */
export function categoryFor(key: string): Category | undefined {
  const direct = CATEGORY_BY_SLUG.get(key);
  if (direct) return direct;
  const k = fold(key).replace(/[-_]+/g, ' ');
  return CATEGORIES.find((c) => c.aliases.some((a) => k === a || k.startsWith(a + ' ') || k.startsWith(a)));
}

export function categoryLabel(key: string, lang: 'uz' | 'ru'): string {
  const c = categoryFor(key);
  if (c) return c.label[lang];
  const label = key.replace(/[_-]+/g, ' ').trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function categoryIcon(key: string): string {
  return categoryFor(key)?.icon ?? 'package-variant-closed';
}
