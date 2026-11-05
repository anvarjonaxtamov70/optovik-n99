import assert from 'node:assert/strict';
import test from 'node:test';

import { cartLines, clampToStock, emptyCart, MAX_LINES, restoreCart, setQty, summarize, toggleLine } from '../src/domain/cart.ts';
import { DEFAULT_SETTINGS, isSafeLink, readBanners, readSettings } from '../src/domain/content.ts';
import { formatSom, groupDigits } from '../src/domain/money.ts';
import { buildOrderWrite, nextStatus, orderNumber, readOrder, recomputeTotals, statusFlow, validateCheckout } from '../src/domain/order.ts';
import { displayPhone, formatLocal, isValidUzPhone, localDigits, toE164 } from '../src/domain/phone.ts';
import { applyFilters, discountPercent, isPlaceholderCatalog, readCachedProducts, readProducts, searchScore, similarProducts, toCache } from '../src/domain/products.ts';
import { categoryFor, categoryLabel, parseModels } from '../src/domain/taxonomy.ts';
import { compactCode, fold } from '../src/domain/text.ts';
import { ru } from '../src/i18n/ru.ts';
import { uz } from '../src/i18n/uz.ts';

const raw = {
  dvigatel: {
    oil: { nomi: 'Moy filtri', narxi: 45000, eskiNarx: 52000, qoldiq: 12, artikul: '96 879 797', model: 'Cobalt, Gentra, Nexia 3', ommabop: true },
    belt: { nomi: 'GRM tasmasi', narxi: 180000, qoldiq: 0, model: 'Nexia', rasm: 'http://insecure.example/x.jpg' },
  },
  aksessuarlar: {
    holder: { nomi: 'Telefon tutqichi', narxi: 65000, qoldiq: 4, model: 'Universal', rasmlar: ['https://cdn.example/a.jpg', 'ftp://bad', 'https://cdn.example/b.jpg'], yangi: true },
  },
  bad: { x: { nomi: '', narxi: 1, qoldiq: 1 }, y: { nomi: 'Narxsiz', qoldiq: 1 }, 'a.b': { nomi: 'Kalit', narxi: 1, qoldiq: 1 } },
};
const products = readProducts(raw);
const byId = new Map(products.map((p) => [p.id, p]));
const P = (id) => byId.get(id);

test('katalog: eski {nomi,narxi,qoldiq} tuzilmasi va yangi maydonlar o‘qiladi, buzuqlari tashlanadi', () => {
  assert.equal(products.length, 3);
  const legacy = readProducts({ kategoriya_1: { '001': { nomi: 'Mahsulot 1', narxi: 150000, qoldiq: 10 } } });
  assert.equal(legacy[0].id, 'kategoriya_1/001');
  assert.equal(isPlaceholderCatalog(legacy), true);
  assert.equal(isPlaceholderCatalog(products), false);
  assert.deepEqual(P('aksessuarlar/holder').rasmlar, ['https://cdn.example/a.jpg', 'https://cdn.example/b.jpg']);
  assert.deepEqual(P('dvigatel/belt').rasmlar, [], 'HTTP rasm qabul qilinmaydi');
  assert.equal(P('dvigatel/oil').eskiNarx, 52000);
  assert.equal(discountPercent(P('dvigatel/oil')), 13);
  assert.equal(readProducts({ a: { b: { nomi: 'X', narxi: 100, eskiNarx: 90, qoldiq: 1 } } })[0].eskiNarx, undefined, 'eski narx kichik bo‘lsa aksiya yo‘q');
});

test('kesh: toCache → readCachedProducts aylanib qaytadi, noto‘g‘ri id lar tashlanadi', () => {
  const cached = readCachedProducts([...toCache(products), { id: 'a/b/c', nomi: 'X', narxi: 1, qoldiq: 1 }, { id: 'noslash', nomi: 'X', narxi: 1, qoldiq: 1 }]);
  assert.deepEqual(cached.map((p) => p.id).sort(), products.map((p) => p.id).sort());
});

test('modellar: Nexia 3 va Nexia 2 farqlanadi, Universal aniqlanadi', () => {
  assert.deepEqual(parseModels('Cobalt, Gentra, Nexia 3').slugs.sort(), ['cobalt', 'gentra', 'nexia3']);
  assert.deepEqual(parseModels('Nexia').slugs, ['nexia2']);
  assert.deepEqual(parseModels('Кобальт / Нексия 3').slugs.sort(), ['cobalt', 'nexia3']);
  assert.equal(parseModels('Universal').universal, true);
  assert.equal(parseModels('').slugs.length, 0);
});

test('kategoriyalar: eski kalitlar taksonomiyaga bog‘lanadi', () => {
  assert.equal(categoryFor('motor')?.slug, 'dvigatel');
  assert.equal(categoryFor('Aksessuarlar')?.slug, 'aksessuarlar');
  assert.equal(categoryLabel('tormoz', 'ru'), 'Тормозная система');
  assert.equal(categoryLabel('kategoriya_1', 'uz'), 'Kategoriya 1');
});

test('qidiruv: kirill/lotin, artikul bo‘shliqsiz, bitta harf xatosi, model nomi', () => {
  assert.equal(fold('Кобальт'), 'kobalt');
  assert.equal(fold('Cobalt'), 'kobalt');
  assert.equal(compactCode('96-879 797'), '96879797');
  assert.equal(searchScore(P('dvigatel/oil'), '96879797'), 100);
  assert.ok(searchScore(P('dvigatel/oil'), 'moy filtri cobalt') > 0);
  assert.ok(searchScore(P('dvigatel/oil'), 'филтри') > 0, 'kirillcha + bitta harf');
  assert.ok(searchScore(P('dvigatel/oil'), 'Двигатель') > 0, 'ruscha kategoriya nomi');
  assert.equal(searchScore(P('dvigatel/oil'), 'tormoz'), 0);
  assert.deepEqual(applyFilters(products, { query: 'tutqich' }).map((p) => p.id), ['aksessuarlar/holder']);
});

test('filtrlar: model (universal ham), mavjud, aksiya, narx, saralash', () => {
  assert.deepEqual(applyFilters(products, { model: 'cobalt' }).map((p) => p.id).sort(), ['aksessuarlar/holder', 'dvigatel/oil']);
  assert.deepEqual(applyFilters(products, { inStock: true }).map((p) => p.id).includes('dvigatel/belt'), false);
  assert.deepEqual(applyFilters(products, { sale: true }).map((p) => p.id), ['dvigatel/oil']);
  assert.deepEqual(applyFilters(products, { minPrice: 50000, maxPrice: 100000 }).map((p) => p.id), ['aksessuarlar/holder']);
  assert.deepEqual(applyFilters(products, { sort: 'cheap' }).map((p) => p.narxi), [45000, 65000, 180000]);
  assert.deepEqual(applyFilters(products, { group: 'accessories' }).map((p) => p.id), ['aksessuarlar/holder']);
  assert.ok(similarProducts(products, P('dvigatel/oil')).every((p) => p.qoldiq > 0));
});

test('savat: qoldiqdan oshmaydi, 50 turdan ko‘p bo‘lmaydi, tiklashda buzuqlar tashlanadi', () => {
  let c = setQty(emptyCart, 'dvigatel/oil', 20, 12);
  assert.equal(c.items['dvigatel/oil'], 12);
  c = setQty(c, 'dvigatel/oil', 0, 12);
  assert.equal(c.items['dvigatel/oil'], undefined);
  let full = emptyCart;
  for (let i = 0; i < MAX_LINES + 5; i++) full = setQty(full, `k/p${i}`, 1, 5);
  assert.equal(Object.keys(full.items).length, MAX_LINES);
  const restored = restoreCart({ items: { 'a/b': 2, 'bad': 3, 'a/c': -1, 'a/d': 1.5 }, off: { 'a/b': true, 'x/y': true } });
  assert.deepEqual(restored, { items: { 'a/b': 2 }, off: { 'a/b': true } });
});

test('savat hisobi: tanlanmagan va tugagan tovar kirmaydi, chegirma va yetkazish', () => {
  let c = setQty(emptyCart, 'dvigatel/oil', 2, 12);
  c = setQty(c, 'aksessuarlar/holder', 1, 4);
  c = { ...c, items: { ...c.items, 'dvigatel/belt': 1, 'yoq/tovar': 1 } };
  const lines = cartLines(c, byId);
  assert.deepEqual(lines.map((l) => [l.id, l.problem, l.selected]), [
    ['dvigatel/oil', null, true], ['aksessuarlar/holder', null, true], ['dvigatel/belt', 'soldout', false], ['yoq/tovar', 'missing', false],
  ]);
  const pricing = { courierEnabled: true, courierFee: 20000, freeDeliveryFrom: 200000 };
  const s = summarize(lines, pricing, 'kuryer');
  assert.equal(s.subtotal, 2 * 45000 + 65000);
  assert.equal(s.savings, 2 * 7000);
  assert.equal(s.delivery, 20000);
  assert.equal(s.total, s.subtotal + 20000);
  assert.equal(s.freeLeft, 200000 - s.subtotal);
  assert.equal(summarize(lines, pricing, 'olib').delivery, 0);
  const off = summarize(cartLines(toggleLine(c, 'aksessuarlar/holder'), byId), pricing, 'olib');
  assert.equal(off.subtotal, 90000);
  assert.equal(summarize(cartLines(setQty(c, 'dvigatel/oil', 5, 12), byId), pricing, 'kuryer').delivery, 0, 'chegaradan oshsa bepul');
});

test('savat: qoldiq kamaysa moslanadi, tugagani "tugagan" bo‘lib qoladi', () => {
  const c = { items: { 'dvigatel/oil': 30, 'dvigatel/belt': 2 }, off: {} };
  const { cart, changed } = clampToStock(c, byId);
  assert.equal(changed, true);
  assert.equal(cart.items['dvigatel/oil'], 12);
  assert.equal(cart.items['dvigatel/belt'], 2);
});

test('buyurtma: atomar yozuv tuzilmasi, holatlar ketma-ketligi, summa qayta hisobi', () => {
  const c = setQty(setQty(emptyCart, 'dvigatel/oil', 2, 12), 'aksessuarlar/holder', 1, 4);
  const lines = cartLines(c, byId);
  const summary = summarize(lines, { courierEnabled: true, courierFee: 20000, freeDeliveryFrom: 0 }, 'kuryer');
  const form = { ism: ' Ali ', telefon: '+998901234567', turi: 'kuryer', manzil: 'Samarqand, Registon 1', moljal: '', izoh: '' };
  assert.deepEqual(validateCheckout(form), {});
  assert.deepEqual(Object.keys(validateCheckout({ ...form, ism: '', telefon: '+99890', manzil: '' })).sort(), ['ism', 'manzil', 'telefon']);
  const ts = { '.sv': 'timestamp' };
  const w = buildOrderWrite({ uid: 'u1', orderId: 'o1', raqam: 123456, lines, summary, form, lang: 'uz', platform: 'ios', ts });
  assert.deepEqual(Object.keys(w).sort(), ['customers/u1/lastOrderAt', 'orderIndex/o1', 'orders/u1/o1']);
  const o = w['orders/u1/o1'];
  assert.deepEqual(o.items.dvigatel.oil, { nomi: 'Moy filtri', narxi: 45000, soni: 2, eskiNarx: 52000 });
  assert.equal(o.jami, o.summa + o.yetkazishNarxi);
  assert.equal(o.mijoz.ism, 'Ali');
  assert.equal(w['orderIndex/o1'].jami, o.jami);
  assert.equal(w['orderIndex/o1'].uid, 'u1');
  const read = readOrder('u1', 'o1', { ...o, createdAt: 1, updatedAt: 1, tarix: { yangi: 1 } });
  assert.equal(recomputeTotals(read).jami, o.jami);
  assert.deepEqual(statusFlow('olib'), ['yangi', 'tasdiqlandi', 'tayyor', 'yetkazildi']);
  assert.equal(nextStatus({ holat: 'tasdiqlandi', yetkazish: { turi: 'kuryer' } }), 'yolda');
  assert.equal(nextStatus({ holat: 'bekor', yetkazish: { turi: 'kuryer' } }), null);
  assert.equal(orderNumber(4521), 'N004521');
});

test('telefon: +998 niqobi va tekshiruv', () => {
  assert.equal(localDigits('+998 (90) 123-45-67'), '901234567');
  assert.equal(formatLocal('901234567'), '90 123 45 67');
  assert.equal(formatLocal('9012'), '90 12');
  assert.equal(isValidUzPhone('901234567'), true);
  assert.equal(isValidUzPhone('121234567'), false);
  assert.equal(toE164('90 123 45 67'), '+998901234567');
  assert.equal(displayPhone('+998901234567'), '+998 90 123 45 67');
});

test('pul: guruhlash va valyuta', () => {
  assert.equal(groupDigits(1250000), '1\u00A0250\u00A0000');
  assert.equal(formatSom(45000, 'uz'), '45\u00A0000\u00A0so‘m');
  assert.equal(formatSom(45000, 'ru'), '45\u00A0000\u00A0сум');
});

test('bannerlar va sozlamalar: xavfsiz havola, standart qiymatlar', () => {
  assert.equal(isSafeLink('sale'), true);
  assert.equal(isSafeLink('cat:tormoz'), true);
  assert.equal(isSafeLink('javascript:alert(1)'), false);
  assert.equal(isSafeLink('http://insecure'), false);
  const b = readBanners({ a: { title: 'Yangi', link: 'javascript:x', order: 2 }, b: { title: { uz: 'B', ru: 'Б' }, active: false }, c: { title: { ru: 'Только ру' }, order: 1 } });
  assert.deepEqual(b.map((x) => [x.id, x.link]), [['c', 'catalog'], ['a', 'catalog']]);
  assert.equal(b[0].title.uz, 'Только ру');
  assert.deepEqual(readSettings(null), DEFAULT_SETTINGS);
  const s = readSettings({ courierFee: 15000, courierEnabled: false, phone: '+998901234567', lat: 39.65, lng: 'x' });
  assert.equal(s.courierFee, 15000);
  assert.equal(s.courierEnabled, false);
  assert.equal(s.lat, 39.65);
  assert.equal(s.lng, null);
});

test('tarjima: o‘zbekcha va ruscha kalitlar va {o‘zgaruvchilar} bir xil', () => {
  assert.deepEqual(Object.keys(ru).sort(), Object.keys(uz).sort());
  const vars = (s) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort().join(',');
  for (const k of Object.keys(uz)) assert.equal(vars(ru[k]), vars(uz[k]), `kalit: ${k}`);
});
