// Realtime Database xavfsizlik qoidalarini emulyatorda tekshiradi. Production bazaga TEGMAYDI.
//   npx firebase-tools emulators:exec --only database --project demo-n99 "node --test tests/rules.emulator.mjs"
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const host = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
if (!host) throw new Error('FIREBASE_DATABASE_EMULATOR_HOST yo‘q — testni emulators:exec ichida ishga tushiring');
const NS = 'demo-n99-default-rtdb';
const base = `http://${host}`;
const TS = { '.sv': 'timestamp' };

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
function token(uid, provider = 'anonymous', email) {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    iss: 'https://securetoken.google.com/demo-n99', aud: 'demo-n99', sub: uid, user_id: uid, iat: now, exp: now + 3600, auth_time: now,
    ...(email ? { email, email_verified: true } : {}), firebase: { sign_in_provider: provider, identities: {} },
  })}.`;
}
const ALICE = token('alice');
const BOB = token('bob');
const OWNER = token('owner', 'password', 'owner@n99.uz');

async function req(path, { method = 'GET', body, auth, admin } = {}) {
  const qs = new URLSearchParams({ ns: NS, ...(auth ? { auth } : {}) });
  const res = await fetch(`${base}/${path}.json?${qs}`, {
    method, body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...(admin ? { Authorization: 'Bearer owner' } : {}) },
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}
const ok = (r, msg) => assert.equal(r.status, 200, `${msg}: ${JSON.stringify(r.body)}`);
const denied = (r, msg) => assert.ok(r.status === 401 || r.status === 403, `${msg}: kutilgan rad, keldi ${r.status} ${JSON.stringify(r.body)}`);

const catalog = {
  dvigatel: {
    oil: { nomi: 'Moy filtri', narxi: 45000, eskiNarx: 52000, qoldiq: 3, revision: 1 },
    belt: { nomi: 'GRM tasmasi', narxi: 180000, qoldiq: 1 },
  },
};

function orderWrite(uid, oid, overrides = {}) {
  const items = overrides.items ?? { dvigatel: { oil: { nomi: 'Moy filtri', narxi: 45000, soni: 2, eskiNarx: 52000 } } };
  const summa = overrides.summa ?? 90000;
  const fee = overrides.yetkazishNarxi ?? 0;
  const order = {
    raqam: 123456, createdAt: TS, updatedAt: TS, holat: 'yangi', tarix: { yangi: TS },
    mijoz: { ism: 'Ali', telefon: '+998901234567' }, yetkazish: { turi: 'olib' }, tolov: 'naqd',
    items, summa, yetkazishNarxi: fee, jami: summa + fee, soni: 2, til: 'uz', platforma: 'ios', ...overrides.order,
  };
  const index = { uid, raqam: 123456, createdAt: TS, holat: 'yangi', jami: summa + fee, ism: 'Ali', telefon: '+998901234567', soni: 2, turi: 'olib', ...overrides.index };
  const out = { [`orders/${uid}/${oid}`]: order, [`orderIndex/${oid}`]: index, [`customers/${uid}/lastOrderAt`]: TS };
  if (overrides.noLast) delete out[`customers/${uid}/lastOrderAt`];
  return out;
}
const place = (auth, uid, oid, o) => req('', { method: 'PATCH', auth, body: orderWrite(uid, oid, o) });

test.before(async () => {
  const rules = readFileSync(new URL('../database.rules.json', import.meta.url), 'utf8');
  const r = await fetch(`${base}/.settings/rules.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: rules });
  assert.equal(r.status, 200, await r.text());
  ok(await req('', { method: 'PUT', admin: true, body: {
    tovarlar: catalog, admins: { owner: true }, settings: { shop: { courierFee: 20000, courierEnabled: true } },
  } }), 'seed');
});

test('ommaviy o‘qish: katalog, banner, sozlama ochiq; qolgani yopiq', async () => {
  ok(await req('tovarlar'), 'tovarlar');
  ok(await req('bannerlar'), 'bannerlar');
  ok(await req('settings/shop'), 'settings');
  denied(await req('orders'), 'orders');
  denied(await req('orderIndex'), 'orderIndex');
  denied(await req('customers'), 'customers');
  denied(await req('admins/owner'), 'admins');
  denied(await req('tovarlar/dvigatel/oil/narxi', { method: 'PUT', auth: ALICE, body: 1 }), 'mijoz narxni o‘zgartira olmaydi');
});

test('buyurtma: noto‘g‘ri narx, ortiqcha miqdor, soxta tovar, zaxira, indeks va vaqt rad etiladi', async () => {
  denied(await place(ALICE, 'alice', 'bad1', { items: { dvigatel: { oil: { nomi: 'Moy filtri', narxi: 1000, soni: 2, eskiNarx: 52000 } } }, summa: 2000 }), 'narx');
  denied(await place(ALICE, 'alice', 'bad2', { items: { dvigatel: { oil: { nomi: 'Moy filtri', narxi: 45000, soni: 4, eskiNarx: 52000 } } }, summa: 180000 }), 'qoldiqdan ko‘p');
  denied(await place(ALICE, 'alice', 'bad3', { items: { dvigatel: { fake: { nomi: 'X', narxi: 45000, soni: 1 } } }, summa: 45000 }), 'mavjud bo‘lmagan tovar');
  denied(await place(ALICE, 'alice', 'bad4', { order: { zaxira: true } }), 'mijoz zaxira belgisini qo‘ya olmaydi');
  denied(await place(ALICE, 'alice', 'bad5', { index: { jami: 1 } }), 'indeks summasi mos emas');
  denied(await place(ALICE, 'alice', 'bad6', { noLast: true }), 'lastOrderAt yo‘q');
  denied(await place(ALICE, 'alice', 'bad7', { order: { createdAt: 1 }, index: { createdAt: 1 } }), 'vaqt server vaqti emas');
  denied(await place(ALICE, 'alice', 'bad8', { yetkazishNarxi: 5000 }), 'yetkazish narxi sozlamaga mos emas');
  denied(await place(ALICE, 'alice', 'bad9', { order: { tolov: 'karta' } }), 'faqat naqd');
  denied(await place(ALICE, 'alice', 'bad10', { order: { yetkazish: { turi: 'kuryer' } }, index: { turi: 'kuryer' } }), 'kuryerga manzil shart');
  denied(await place(BOB, 'alice', 'bad11'), 'boshqa mijoz nomidan');
  denied(await place(undefined, 'alice', 'bad12'), 'kirmagan foydalanuvchi');
});

test('buyurtma: to‘g‘ri buyurtma o‘tadi, 30 soniya ichida ikkinchisi rad etiladi', async () => {
  ok(await place(ALICE, 'alice', 'o1'), 'to‘g‘ri buyurtma');
  denied(await place(ALICE, 'alice', 'o2'), 'tezkor ikkinchi buyurtma');
  ok(await place(BOB, 'bob', 'b1', { items: { dvigatel: { belt: { nomi: 'GRM tasmasi', narxi: 180000, soni: 1 } } }, summa: 180000, order: { yetkazish: { turi: 'kuryer', manzil: 'Samarqand, Registon 1' }, soni: 1 }, index: { turi: 'kuryer', soni: 1 }, yetkazishNarxi: 20000 }), 'kuryer bilan');
  const mine = await req('orders/alice', { auth: ALICE });
  ok(mine, 'o‘z buyurtmalari');
  assert.equal(typeof mine.body.o1.createdAt, 'number');
  denied(await req('orders/alice', { auth: BOB }), 'begona buyurtmalar');
  denied(await req('orders/alice/o1', { method: 'PUT', auth: ALICE, body: null }), 'mijoz o‘chira olmaydi');
});

test('mijoz faqat "yangi" buyurtmani bekor qila oladi, boshqa narsani o‘zgartira olmaydi', async () => {
  denied(await req('orders/alice/o1/holat', { method: 'PUT', auth: ALICE, body: 'yetkazildi' }), 'yetkazildi qila olmaydi');
  denied(await req('orders/alice/o1/items/dvigatel/oil/soni', { method: 'PUT', auth: ALICE, body: 1 }), 'tarkibni o‘zgartira olmaydi');
  denied(await req('orders/alice/o1/summa', { method: 'PUT', auth: ALICE, body: 1 }), 'summani o‘zgartira olmaydi');
  denied(await req('', { method: 'PATCH', auth: BOB, body: { 'orders/alice/o1/holat': 'bekor', 'orderIndex/o1/holat': 'bekor' } }), 'begona bekor qila olmaydi');
  ok(await req('', { method: 'PATCH', auth: ALICE, body: {
    'orders/alice/o1/holat': 'bekor', 'orders/alice/o1/tarix/bekor': TS, 'orders/alice/o1/updatedAt': TS, 'orderIndex/o1/holat': 'bekor',
  } }), 'bekor qilish');
  denied(await req('orders/alice/o1/holat', { method: 'PUT', auth: ALICE, body: 'yangi' }), 'qayta tiklay olmaydi');
});

test('admin: indeksni o‘qiydi, tasdiqlab qoldiqni atomar ayiradi, manfiy qoldiq rad etiladi', async () => {
  denied(await req('orderIndex', { auth: ALICE }), 'mijoz indeksni o‘qiy olmaydi');
  const idx = await req('orderIndex', { auth: OWNER });
  ok(idx, 'admin indeks');
  assert.ok(idx.body.b1);
  ok(await req('', { method: 'PATCH', auth: OWNER, body: {
    'orders/bob/b1/holat': 'tasdiqlandi', 'orders/bob/b1/tarix/tasdiqlandi': TS, 'orders/bob/b1/updatedAt': TS, 'orders/bob/b1/zaxira': true,
    'orderIndex/b1/holat': 'tasdiqlandi', 'tovarlar/dvigatel/belt/qoldiq': { '.sv': { increment: -1 } }, 'tovarlar/dvigatel/belt/revision': { '.sv': { increment: 1 } },
  } }), 'tasdiqlash + qoldiq');
  assert.equal((await req('tovarlar/dvigatel/belt/qoldiq')).body, 0);
  denied(await req('', { method: 'PATCH', auth: OWNER, body: { 'tovarlar/dvigatel/belt/qoldiq': { '.sv': { increment: -1 } } } }), 'manfiy qoldiq');
  denied(await req('orders/bob/b1/holat', { method: 'PUT', auth: OWNER, body: 'yoqolgan' }), 'noma’lum holat');
});

test('admin: tovar, banner va sozlamalar tekshiriladi; mijoz yoza olmaydi', async () => {
  ok(await req('tovarlar/filtrlar/air', { method: 'PUT', auth: OWNER, body: { nomi: 'Havo filtri', narxi: 35000, qoldiq: 5, revision: 1, rasmlar: ['https://cdn.example/a.jpg'] } }), 'yangi tovar');
  denied(await req('tovarlar/filtrlar/air2', { method: 'PUT', auth: OWNER, body: { nomi: 'X', narxi: 10.5, qoldiq: 1 } }), 'kasr narx');
  denied(await req('tovarlar/filtrlar/air3', { method: 'PUT', auth: OWNER, body: { nomi: 'X', narxi: 10, qoldiq: 1, rasm: 'http://x' } }), 'http rasm');
  denied(await req('tovarlar/filtrlar/air4', { method: 'PUT', auth: OWNER, body: { nomi: 'X', narxi: 10, qoldiq: 1, hack: 1 } }), 'begona maydon');
  denied(await req('tovarlar/filtrlar/air/revision', { method: 'PUT', auth: OWNER, body: 5 }), 'revision faqat +1');
  denied(await req('tovarlar/filtrlar/x', { method: 'PUT', auth: ALICE, body: { nomi: 'X', narxi: 1, qoldiq: 1 } }), 'mijoz tovar qo‘sha olmaydi');
  ok(await req('bannerlar/b1', { method: 'PUT', auth: OWNER, body: { title: { uz: 'Aksiya', ru: 'Акция' }, link: 'sale', theme: 'brand', order: 0, active: true } }), 'banner');
  denied(await req('bannerlar/b2', { method: 'PUT', auth: OWNER, body: { title: { uz: 'X' }, link: 'javascript:alert(1)' } }), 'xavfli havola');
  denied(await req('bannerlar/b3', { method: 'PUT', auth: ALICE, body: { title: { uz: 'X' }, link: 'sale' } }), 'mijoz banner qo‘sha olmaydi');
  ok(await req('settings/shop/courierFee', { method: 'PUT', auth: OWNER, body: 25000 }), 'sozlama');
  denied(await req('settings/shop/secret', { method: 'PUT', auth: OWNER, body: 'x' }), 'begona sozlama');
  denied(await req('settings/shop/courierFee', { method: 'PUT', auth: ALICE, body: 0 }), 'mijoz sozlama yoza olmaydi');
  denied(await req('admins/alice', { method: 'PUT', auth: ALICE, body: true }), 'o‘zini admin qila olmaydi');
});

test('profil: faqat egasi, to‘g‘ri telefon bilan', async () => {
  ok(await req('customers/alice/profile', { method: 'PUT', auth: ALICE, body: { name: 'Ali', phone: '+998901234567', address: '', landmark: '', updatedAt: 1 } }), 'profil');
  denied(await req('customers/alice/profile', { method: 'PUT', auth: ALICE, body: { name: 'Ali', phone: '12345' } }), 'telefon');
  denied(await req('customers/alice/profile', { method: 'PUT', auth: BOB, body: { name: 'Ali', phone: '+998901234567' } }), 'begona profil');
  ok(await req('customers/alice', { auth: OWNER }), 'admin mijozni ko‘radi');
  denied(await req('customers/alice', { auth: BOB }), 'begona mijoz');
});
