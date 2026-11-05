import assert from 'node:assert/strict';
import test from 'node:test';

import { defaultCatalogOptions, discountPercent, matchesDepartment, selectCatalog, toggleComparison } from '../src/store/catalog.ts';
import { filterProducts, readProducts } from '../src/store/shop.ts';

const products = readProducts({
  dvigatel: {
    oil: { nomi: 'Moy filtri', model: 'Cobalt · Gentra', narxi: 85000, eskiNarx: 100000, qoldiq: 3 },
    gaz: { nomi: 'Gazel filtri', model: 'Gazel Next', narxi: 90000, qoldiq: 2 },
    spark: { nomi: 'Svecha', model: 'Spark', artikul: 'GM-42', narxi: 40000, qoldiq: 0 },
  },
  aksessuarlar: { holder: { nomi: 'Telefon tutqichi', model: 'Universal', narxi: 65000, qoldiq: 4 } },
  kategoriya_1: { legacy: { nomi: 'Eski katalog mahsuloti', narxi: 100, qoldiq: 1 } },
});

test('department filters preserve legacy records in all and distinguish GM parts from accessories', () => {
  assert.equal(selectCatalog(products, 'all', defaultCatalogOptions).length, 5);
  assert.deepEqual(products.filter((p) => matchesDepartment(p, 'gm')).map((p) => p.id), ['dvigatel/oil', 'dvigatel/spark']);
  assert.deepEqual(products.filter((p) => matchesDepartment(p, 'accessories')).map((p) => p.id), ['aksessuarlar/holder']);
  assert.equal(matchesDepartment({ ...products[0], nomi: 'Cobalt gilamchasi' }, 'gm'), false);
});
test('search, category, department, availability and price sort work together without mutating the live catalog', () => {
  const before = products.map((p) => p.id);
  const list = selectCatalog(filterProducts(products, 'Cobalt filtr', 'dvigatel'), 'gm', { ...defaultCatalogOptions, availableOnly: true, sort: 'price-asc' });
  assert.deepEqual(list.map((p) => p.id), ['dvigatel/oil']);
  const sorted = selectCatalog(products, 'all', { ...defaultCatalogOptions, sort: 'price-desc' });
  assert.equal(sorted[0].id, 'dvigatel/gaz');
  assert.deepEqual(products.map((p) => p.id), before);
});
test('discount uses real prices and changes when either price is updated', () => {
  assert.equal(discountPercent(products[0]), 15);
  assert.equal(discountPercent({ ...products[0], narxi: 75000 }), 25);
  assert.equal(discountPercent({ ...products[0], eskiNarx: 85000 }), 0);
  assert.equal(discountPercent({ ...products[0], eskiNarx: undefined }), 0);
  assert.equal(discountPercent({ ...products[0], eskiNarx: Infinity }), 0);
});
test('sale filter only includes an actual reduction and availability still applies', () => {
  const list = [...products, { ...products[0], id: 'x/equal', eskiNarx: 85000 }, { ...products[0], id: 'x/out', qoldiq: 0 }];
  assert.deepEqual(selectCatalog(list, 'all', { ...defaultCatalogOptions, saleOnly: true, availableOnly: true }).map((p) => p.id), ['dvigatel/oil']);
});
test('comparison is limited to two distinct category/product IDs and supports removal then replacement', () => {
  let ids = toggleComparison([], 'category1/001');
  ids = toggleComparison(ids, 'category2/001');
  assert.deepEqual(ids, ['category1/001', 'category2/001']);
  assert.deepEqual(toggleComparison(ids, 'third/003'), ids);
  ids = toggleComparison(ids, 'category1/001');
  assert.deepEqual(toggleComparison(ids, 'third/003'), ['category2/001', 'third/003']);
});
