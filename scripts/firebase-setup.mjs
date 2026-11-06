#!/usr/bin/env node
/**
 * Firebase'ni bir bosishda sozlash (GitHub Actions → "Firebase sozlash"):
 *   1) database.rules.json xavfsizlik qoidalarini joylaydi;
 *   2) Authentication'da Anonymous (mijozlar) va Email/Password (admin) kirishni yoqadi;
 *   3) katalog bo'sh yoki faqat "Mahsulot 1/2" namunasi bo'lsa — seed/katalog.json ni yuklaydi;
 *   4) ADMIN_EMAIL berilsa — o'sha Firebase foydalanuvchisini admins/{uid} ga qo'shadi.
 *
 * Muhit o'zgaruvchilari:
 *   FIREBASE_SERVICE_ACCOUNT  service account JSON (yoki base64)            [GitHub secret, majburiy]
 *   FIREBASE_DB_URL           baza manzili (bo'lmasa src/lib/firebase.ts dagi)
 *   SEED                      auto | force | skip   (standart: auto)
 *   ADMIN_EMAIL               admin qilinadigan email (ixtiyoriy)
 * Lokal emulator: FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 node scripts/firebase-setup.mjs
 */
import { createSign } from 'node:crypto';
import { appendFileSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const summary = [];
const log = (line) => { console.log(line); summary.push(line); };
const fail = (msg) => { console.error(`::error::${msg}`); flush(); process.exit(1); };
function flush() {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Firebase sozlash\n\n${summary.map((s) => `- ${s}`).join('\n')}\n`);
}

const rules = readFileSync(new URL('database.rules.json', root), 'utf8');
try { JSON.parse(rules); } catch (e) { fail(`database.rules.json — noto'g'ri JSON: ${e.message}`); }
const seed = JSON.parse(readFileSync(new URL('seed/katalog.json', root), 'utf8'));
const config = readFileSync(new URL('src/lib/firebase.ts', root), 'utf8');
const configDb = config.match(/databaseURL:\s*'([^']+)'/)?.[1];
const configProject = config.match(/projectId:\s*'([^']+)'/)?.[1];
const SEED = (process.env.SEED || 'auto').trim();
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();

const emulator = process.env.FIREBASE_DATABASE_EMULATOR_HOST;
let dbUrl, headers, projectId;
let q = '';

if (emulator) {
  const ns = process.env.FIREBASE_DB_NAMESPACE || `${configProject}-default-rtdb`;
  dbUrl = `http://${emulator}`;
  headers = { Authorization: 'Bearer owner' };
  projectId = configProject;
  q = `?ns=${ns}`;
} else {
  const raw = (process.env.FIREBASE_SERVICE_ACCOUNT ?? '').trim();
  if (!raw) fail('FIREBASE_SERVICE_ACCOUNT berilmagan (GitHub → Settings → Secrets and variables → Actions → New repository secret)');
  let sa;
  try { sa = JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')); } catch { fail("FIREBASE_SERVICE_ACCOUNT — JSON emas. Firebase'dan yuklangan .json faylning butun matnini qo'ying"); }
  if (!sa.client_email || !sa.private_key || !sa.project_id) fail("FIREBASE_SERVICE_ACCOUNT to'liq emas (client_email, private_key, project_id kerak)");
  projectId = sa.project_id;
  dbUrl = (process.env.FIREBASE_DB_URL || configDb || `https://${projectId}-default-rtdb.firebaseio.com`).trim().replace(/\/+$/, '');
  if (!/^https:\/\/[\w.-]+\.(firebaseio\.com|firebasedatabase\.app)$/.test(dbUrl)) fail(`FIREBASE_DB_URL noto'g'ri: ${dbUrl}`);
  const b64u = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64u({ alg: 'RS256', typ: 'JWT' })}.${b64u({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/identitytoolkit',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key.replace(/\\n/g, '\n'), 'base64url');
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` }),
  });
  const token = await tokenRes.json().catch(() => ({}));
  if (!token.access_token) fail(`Google token olinmadi (${tokenRes.status}): ${JSON.stringify(token)}`);
  headers = { Authorization: `Bearer ${token.access_token}` };
  if (projectId !== configProject) log(`⚠️ Service account loyihasi (${projectId}) ilovadagi loyiha (${configProject}) bilan bir xil emas.`);
}
const db = (path, init = {}) => fetch(`${dbUrl}/${path}.json${q}`, { ...init, headers: { ...headers, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });

// 1) Qoidalar
{
  const res = await fetch(`${dbUrl}/.settings/rules.json${q}`, { method: 'PUT', headers, body: rules });
  if (!res.ok) {
    if (res.status === 404) fail(`Baza topilmadi: ${dbUrl}. Firebase → Realtime Database yaratilganini tekshiring.`);
    fail(`Qoidalar joylanmadi (${res.status}): ${await res.text()}`);
  }
  log('✅ Xavfsizlik qoidalari joylandi');
}

// 2) Kirish usullari (faqat haqiqiy loyihada)
if (!emulator) {
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
  const res = await fetch(`${url}?updateMask=signIn.anonymous.enabled,signIn.email.enabled,signIn.email.passwordRequired`, {
    method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json', 'X-Goog-User-Project': projectId },
    body: JSON.stringify({ signIn: { anonymous: { enabled: true }, email: { enabled: true, passwordRequired: true } } }),
  });
  if (res.ok) log('✅ Authentication: Anonymous (mijozlar) va Email/Password (admin) yoqildi');
  else {
    const text = await res.text();
    log(`⚠️ Authentication avtomatik yoqilmadi (${res.status}). Firebase Console → Build → Authentication → **Get started** bosing, so'ng Sign-in method'da **Anonymous** va **Email/Password** ni yoqing va bu amalni qayta ishga tushiring.`);
    console.error(text.slice(0, 600));
  }
}

// 3) Namuna katalog
{
  const res = await db('tovarlar');
  if (!res.ok) fail(`Katalogni o'qib bo'lmadi (${res.status}): ${await res.text()}`);
  const current = (await res.json()) ?? {};
  const entries = Object.entries(current).flatMap(([cat, items]) => Object.entries(items ?? {}).map(([id, p]) => ({ cat, id, p })));
  const placeholder = entries.length === 0 || entries.every(({ cat, p }) => /^kategoriya_\d+$/.test(cat) && /^mahsulot \d+$/i.test(String(p?.nomi ?? '')));
  if (SEED === 'skip') log('⏭ Katalog: o\'tkazib yuborildi (SEED=skip)');
  else if (!placeholder && SEED !== 'force') log(`⏭ Katalogda ${entries.length} ta haqiqiy tovar bor — namuna yuklanmadi`);
  else {
    const tovarlar = Object.fromEntries(Object.entries(seed.tovarlar).map(([cat, items]) => [cat,
      Object.fromEntries(Object.entries(items).map(([id, p]) => [id, { ...p, revision: 1, updatedAt: { '.sv': 'timestamp' } }]))]));
    if (entries.length) {
      const backup = await db('backup_tovarlar_namuna', { method: 'PUT', body: JSON.stringify(current) });
      if (!backup.ok) fail(`Eski katalog zaxirasi yozilmadi (${backup.status})`);
    }
    const put = await db('tovarlar', { method: 'PUT', body: JSON.stringify(tovarlar) });
    if (!put.ok) fail(`Namuna katalog yozilmadi (${put.status}): ${await put.text()}`);
    const count = Object.values(tovarlar).reduce((n, items) => n + Object.keys(items).length, 0);
    log(`✅ Namuna katalog yuklandi: ${count} ta tovar (narxlarni Admin → Tovarlar'da o'zgartiring)`);
  }
  const settings = await db('settings/shop');
  if (settings.ok && (await settings.json()) === null) {
    const put = await db('settings/shop', { method: 'PUT', body: JSON.stringify(seed.settings.shop) });
    log(put.ok ? '✅ Do\'kon sozlamalari (manzil, yetkazish narxi) yozildi' : `⚠️ Sozlamalar yozilmadi (${put.status})`);
  }
}

// 4) Admin
if (ADMIN_EMAIL) {
  let uid = process.env.ADMIN_UID || '';
  if (!uid && !emulator) {
    const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', 'X-Goog-User-Project': projectId }, body: JSON.stringify({ email: [ADMIN_EMAIL] }),
    });
    const json = await res.json().catch(() => ({}));
    uid = json.users?.[0]?.localId ?? '';
    if (!uid) log(`⚠️ ${ADMIN_EMAIL} topilmadi. Firebase → Authentication → Users → **Add user** bilan shu email va parolni yarating, so'ng qayta ishga tushiring.`);
  }
  if (uid) {
    const put = await db(`admins/${uid}`, { method: 'PUT', body: 'true' });
    log(put.ok ? `✅ ${ADMIN_EMAIL} admin qilindi` : `⚠️ Admin yozilmadi (${put.status})`);
  }
}

flush();
