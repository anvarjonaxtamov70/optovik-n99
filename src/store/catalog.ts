import type { Product } from './shop';

export type Department = 'all' | 'gm' | 'accessories';
export type CatalogSort = 'default' | 'price-asc' | 'price-desc' | 'name';
export type CatalogOptions = { availableOnly: boolean; saleOnly: boolean; sort: CatalogSort };
export const defaultCatalogOptions: CatalogOptions = { availableOnly: false, saleOnly: false, sort: 'default' };

const normalize = (value: string) => value.toLowerCase().replace(/[‘’ʼ`']/g, '').replace(/[_-]+/g, ' ');
export function isAccessory(product: Product) {
  return /aksessuar|accessor|аксессуар|telefon|tutqich|gilam|registrator|videokamera|chexol|чехол|коврик|держатель/.test(normalize(product.kategoriya + ' ' + product.nomi));
}
export function matchesDepartment(product: Product, department: Department) {
  if (department === 'all') return true;
  if (department === 'accessories') return isAccessory(product);
  return !isAccessory(product) && /\b(gm|chevrolet|cobalt|gentra|lacetti|nexia|spark|matiz|damas|labo|captiva|malibu|onix|tracker|epica|aveo)\b|шевроле|кобальт|джентра|нексия/.test(normalize([product.kategoriya, product.model, product.nomi].join(' ')));
}
export function discountPercent(product: Product) {
  if (!Number.isFinite(product.narxi) || !Number.isFinite(product.eskiNarx) || !product.eskiNarx || product.eskiNarx <= product.narxi || product.narxi < 0) return 0;
  return Math.round((1 - product.narxi / product.eskiNarx) * 100);
}
export function selectCatalog(products: Product[], department: Department, options: CatalogOptions) {
  const result = products.filter((p) => matchesDepartment(p, department) && (!options.availableOnly || p.qoldiq > 0) && (!options.saleOnly || !!p.eskiNarx && p.eskiNarx > p.narxi));
  if (options.sort === 'price-asc') result.sort((a, b) => a.narxi - b.narxi);
  if (options.sort === 'price-desc') result.sort((a, b) => b.narxi - a.narxi);
  if (options.sort === 'name') result.sort((a, b) => a.nomi.localeCompare(b.nomi));
  return result;
}
export function toggleComparison(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : ids.length < 2 ? [...ids, id] : ids;
}
