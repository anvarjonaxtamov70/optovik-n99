# Tekshirish

## Avtomatik

```sh
npm ci
npm run typecheck
npm run lint
npm test            # tests/domain.test.mjs — katalog, qidiruv, savat, buyurtma, telefon, pul, tarjimalar
npm run test:rules  # tests/rules.emulator.mjs — xavfsizlik qoidalari emulyatorda (Java 21)
```

GitHub Actions har PR’da shularni va Android/iOS bundle’ni tekshiradi. Emulyator testlari faqat `demo-n99` loyihasida ishlaydi va production bazaga tegmaydi.

Qoidalar testi tekshiradiganlar: soxta narx, qoldiqdan ko‘p miqdor, mavjud bo‘lmagan tovar, mijoz qo‘ygan «zaxira» belgisi, indeks summasi, server vaqti, yetkazish narxi, faqat naqd, kuryerga manzil, boshqa mijoz nomidan buyurtma, 30 soniyalik cheklov, faqat «yangi» buyurtmani bekor qilish, admin tasdiqlaganda qoldiqning atomar ayirilishi va manfiy qoldiq, tovar/banner/sozlama maydonlari, xavfli havolalar, o‘zini admin qila olmaslik, profil telefoni.

## Kompyuterda to‘liq sinov (emulyator)

```sh
# 1-terminal
npx firebase-tools@14 emulators:start --only database,auth --project demo-n99
# 2-terminal: qoidalar + namuna katalog
FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 FIREBASE_DB_NAMESPACE=demo-n99-default-rtdb npm run firebase:setup
# 3-terminal: ilova emulyatorga ulanadi
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=127.0.0.1 npx expo start --web
```

## Telefonda qo‘lda (Expo Go)

1. Ochilish: ko‘k ekranda logotip — g‘ildiraklar aylanadi, gupchaklar yonadi, so‘ng bosh sahifa.
2. Bosh sahifa: bannerlar o‘zi aylanadi va barmoq bilan suriladi; pastga surganda logotip qatori yashirinib, qidiruv tepada qoladi.
3. Qidiruv: `cobalt fara`, `фара кобальт`, `N99 F101`. Natija chiqsin; oxirgi qidiruvlar saqlansin.
4. Mashinani tanlang (qidiruv yonidagi mashina tugmasi) → bosh sahifada «Cobalt uchun», tovar sahifasida «Cobalt ga mos keladi».
5a. Rasmiylashtirish → «Yetkazib berish» → «Manzilni xaritada belgilang»: xarita ochilsin, «Mening joylashuvim» ruxsat so‘rasin, xarita surilganda ko‘cha va uy o‘zi yozilsin. Klaviatura ochilganda yozilayotgan maydon ko‘rinib tursin, klaviatura ustida «Yopish» tugmasi bo‘lsin.
5b. To‘lovda Payme va Click «Tez kunda» bo‘lib tursin, ularni tanlab bo‘lmasin.
5. Kartada **Savatga** → miqdor tanlagichga aylanadi, pastki menyudagi savat soni «sakraydi». Qoldiqdan ko‘p qo‘shib bo‘lmasin.
6. Savat: belgini olib tashlang — jami kamaysin; o‘chiring → «Qaytarish»; ilovani yopib oching — savat saqlangan bo‘lsin.
7. Rasmiylashtirish: olib ketish va kuryer; noto‘g‘ri telefon/bo‘sh ism xato ko‘rsatsin. Buyurtma bering → yashil belgi va konfetti, buyurtma raqami.
8. Buyurtmalarim: holat chizig‘i; admin holatni o‘zgartirsa ekran o‘zi yangilansin. «Bekor qilish» faqat tasdiqlanmaguncha.
9. Til: Kabinet → Til → Русский — barcha matnlar ruscha.
10. Rasm: tovar sahifasida rasmni bosing → to‘liq ekran. Ikki marta bosing va barmoqlar bilan cho‘zing — kattalashsin, surilsin; bir marta bosilganda yopilsin; bir nechta rasm bo‘lsa varaqlanib, hisoblagich («2 / 3») o‘zgarsin.
11. Internetni o‘chiring: saqlangan katalog ko‘rinsin, «Internet yo‘q» xabari, savatga qo‘shish o‘chiq bo‘lsin.
12. iPhone (qosh/Dynamic Island), Android orqaga tugmasi, katta shrift, klaviatura ochilganda maydonlar yopilib qolmasin.
13. Kabinetda admin kirishi **bo‘lmasligi** kerak (boshqaruv faqat brauzerda).

## Do‘kon boshqaruvi (brauzerda)

1. https://optovikn99.web.app/admin — email va parol bilan kiring. Do‘kon sahifalari (`/`, `/cart`) `/admin` ga yo‘naltirilsin.
2. Buyurtmani tasdiqlang → tovar qoldig‘i kamaysin; bekor qiling → qaytsin.
3. Tovar narxini ro‘yxatda o‘zgartirib Enter bosing → telefondagi ilovada darhol yangilansin.
4. Rasm qo‘shish: bir nechta fayl, sahifaga sudrab tashlash, Ctrl+V; tartibni ‹ › bilan o‘zgartirish; Ctrl+S bilan saqlash.

## Isolated staging / Expo Go

Create a separate Firebase Spark project, enable Anonymous and Email/Password authentication, create its default Realtime Database and publish the PR rules **to that staging project only**. Populate it with synthetic catalog data and a test admin. Do not copy production customers or keys. Set the two staging variables from .env.example before starting Metro:

```sh
npx expo start --tunnel
```

Open the Metro QR with a compatible Expo Go version. Staging configuration is mandatory in staging mode; it will not fall back to production. Auth app names and local storage namespaces are isolated. Test project credentials/configuration and the running Metro host are not provisioned by this PR. The existing EAS production publish workflow is not a staging test; app.json sets runtimeVersion, which prevents Expo Go from opening ordinary EAS Updates.

Test checkout on a synthetic product with known stock: submit, interrupt the connection, reopen the app and visit order history; retry only with the original pending ID; verify that one order exists and the cart receipt is applied at most once. Confirm from two admin sessions, verify one stale revision fails; archive an item and confirm or cancel its existing order without losing the inventory record. Do not test these operations on production.

Emulator builds now use the synthetic `demo-n99` Firebase identity and a separate local storage namespace. Only local/private-network emulator hosts are accepted. Existing emulator-only local carts are intentionally not migrated.

## Phase 1 release gate
- [ ] All CI jobs pass on final PR head.
- [ ] Separate Spark staging project provisioned and synthetic catalog seeded.
- [ ] iPhone checkout, interruption/recovery, and admin stock transitions verified in staging.
- [ ] Encrypted backup taken and isolated restore rehearsed (docs/BACKUP_RECOVERY.md).
- [ ] Trusted aggregate pricing, cross-device idempotency and server-owned inventory architecture resolved before claiming full backend security.

## Staging Worker prototype
See backend/README.md for the isolated deployment and test sequence. Keep production rules and deployments unchanged.

## Release acceptance additions
- `npm test`: synthetic competing transaction tests and backup roundtrip.
- `N99_STRICT_AUDIT=1 node scripts/audit-dependencies.mjs`: release gate fails on high or critical findings; routine dependency CI retains the existing critical-only gate and reports strict release status. Failed/malformed audits are errors, not empty reports.
- `node scripts/verify-restore.mjs <local-export.json>`: offline relationship checks, no network writes. Actual encrypted backup and isolated restore still required.

### Dependency remediation candidate
The phase-one PR runs a read-only candidate job: move local ngrok tooling to devDependencies, apply compatible npm audit fixes without --force, then audit, typecheck, lint, run tests and export both mobile bundles. The candidate package and lockfile are artifacts only until reviewed and committed. Production deployment is not triggered. A passing candidate does not imply zero vulnerabilities; inspect its audit report.

The targeted dependency candidate replaces the broad audit-fix experiment: only ngrok classification and exact same-major overrides for Firestore's grpc-js and Expo fingerprint's minimatch may change the manifest. Registry metadata selects stable candidates; audit and compatibility tests must pass before adoption. Candidate lockfile deltas are checksummed and emitted in numbered chunks as well as an artifact; never include runtime secrets in these files.

### Accepted dependency candidate (2026-11-27)
Candidate job 140376970511 passed typecheck, lint, unit tests, Expo compatibility and Android/iOS exports. Its SHA-256 verified lockfile delta is applied: grpc-js 1.14.7, minimatch remains 10.2.6, ngrok is development-only. Candidate production audit: 0 critical, 0 high, 3 moderate (minimatch and dependent Expo packages). Dev-only uuid remains and must not be considered fixed. Routine dependency CI now fails on high or critical findings. Re-run live staging checkout after installing the new lockfile; build checks are not device tests.

### Current release audit and restoration (2026-11-27)
Commit d82a905 CI confirmed 0 critical, 0 high, 3 moderate production findings; remaining minimatch 10.2.6 and its Expo dependency chain have not been fixed. Development-only uuid is still installed; do not claim the full dependency tree is clean. The now-accepted candidate workflow is retired from routine PR runs; the strict locked audit remains. A separate disposable RTDB emulator restore rehearsal is added to CI. Production rollout remains blocked on live staging acceptance and a bounded scalable data architecture, not just green CI.

### Staging v3 transaction resilience
Unit tests cover shared deadline calculation, no write after budget expiry, four-attempt conflict exhaustion and no automatic retry after an ambiguous write. Deploy v3 only to the existing staging Worker after CI passes; re-run the previous device acceptance. v2 remains active until operator deploys. Scalable storage is still a separate implementation gate; see backend/SCALE_PLAN.md.

### Bounded transaction architecture prototype
`node --test tests/transactionPrototype.test.mjs` exercises the isolated in-memory relational prototype with Node 24+, including duplicate recovery, reservation/release and rejected-order rollback. It does not measure distributed concurrency or establish cloud service readiness.

### Synthetic relational recovery and workload
Three additional unit tests cover immutable order-index snapshots and out-of-order replay, isolated SQLite backup restoration, and 100 order lifecycles alongside 1,000 unrelated products. These do not connect to the deployed Worker or Firebase. The database file is temporary and synthetic. No service migration or production scalability is claimed.

### Concurrent SQLite prototype acceptance
`node --test tests/transactionConcurrency.test.mjs` runs three multi-connection tests with six worker threads per scenario, each on a disposable synthetic SQLite file. These complement the sequential workload and emulator restoration. The next real-device gate is to deploy staging Worker v3 after CI and repeat checkout, cancellation and recovery on the existing isolated staging project; do not deploy the SQLite prototype into Cloudflare. Production remains blocked until hosting, durable identity, migration and live acceptance are resolved.

### Foreground pending-order recovery
After the operator reported successful v3 staging checkout, confirmation and cancellation, automatic pending-order reconciliation was extended to foreground activation and bounded retry (up to eight attempts per recovery cycle, 15 seconds between attempts). It only reads an existing order, checks its number and active account, and applies the existing cart receipt. No automatic replacement order is submitted. Missing or malformed pending data never causes a server write. This does not freeze an edited checkout payload on manual retry, establish cross-device identity or prove live interruption recovery; those remain separate gates.

### Manual retry intent binding
A pending order now retains a canonical JSON snapshot of the original order in the existing account-scoped device-local pending record. A manual retry with the same key is allowed only when the original intent matches exactly. The snapshot may contain checkout contact and delivery details; it is not logged or sent as additional server data, is cleared on confirmed completion or a definitive first rejection, and persists locally while unresolved. Existing AsyncStorage is not encrypted at rest by this change. Legacy pending records without an intent can still recover a confirmed server order but cannot be resubmitted automatically or manually with an unverified body. If no server order exists and the original intent cannot be restored, the customer is directed to support; a safe server-side abandon/tombstone protocol is still needed. No pending record is deleted solely because a server read returns null. Test coverage exercises order-independent canonicalization, changed payload rejection and legacy metadata behavior.

### Pending closure and privacy (v4)
Four unit tests exercise marker replay, existing-order protection, competing creation/closure, and per-UID limits. The updated staging order history exposes an explicit confirmed action to close an unconfirmed attempt. The client clears pending metadata only on an authenticated matching `abandoned` acknowledgement. New local pending records persist only ID/number; original intent stays in memory, legacy snapshots are reduced on next successful load. After app restart, a missing intent prevents manual retry until the old attempt is resolved or explicitly closed. This is data minimization, not encryption of other profile/cart storage. Direct production fallback does not support closure; do not clear old keys manually. Live V4 acceptance and production architecture remain open. The existing staging rules are not changed.

### Staging persistent customer identity
Mobile-only staging feature links the current anonymous Firebase UID to email/password, sends verification, supports explicit login from a guest with no existing server orders or pending key, and supports email verification refresh and password reset. Identity changes hold the checkout mutex. Before login, guest local profile/delivery are cleared; remote profile is loaded for the new UID. Cart stays device-local. No automatic account merge, phone-based linking, or production activation. Passwords are not saved by app code. The sign-in flow is not yet live-tested; Firebase email delivery/verification and two-device access require operator testing. Sign-out/account switching for an already linked account, full profile/cart account partitioning, and handling a guest sign-in failure after local profile clearing remain future work. The new account feature uses the existing staging Firebase Email/Password provider, no paid service or provider changes.

### Staging account lifecycle and local profile isolation
Staging mobile profiles are now cached with their UID, and legacy unowned staging profile data is discarded rather than assigned to an unknown customer. Stale profile reads cannot overwrite a newer edit or account. Failed sign-in no longer clears the guest profile before authentication. Sign-out requires verified email and no unresolved pending record; it clears cached contact/delivery data and leaves the server account and orders intact. The auth observer starts a new anonymous session. Old open edit/checkout forms reject UID changes, and checkout throttling is keyed per UID. Browser confirmation fails closed if confirm is unavailable. Cart, favorites, car and search preferences remain device-local and shared as explicitly disclosed in sign-out text (not complete account isolation). No new paid dependencies or production identity changes. Operator must test sign-in, verification, sign-out, wrong credentials, restart and second device. Profile cache is not encrypted at rest.

### Bounded Firestore integration foundation
Five unit tests cover lifecycle with unrelated catalog data, rejection/closure, committed-order closure, REST transaction protocol, explicit-abort retry and unknown-write outcome. The new modules are server-only and not wired to the existing Worker or Expo. Fake transaction and HTTP tests do not validate real Firestore semantics. Next: disposable emulator integration, queryable schema, migration/reader/writer parity, isolated staging rollout and rollback. Keep Spark/no billing and do not copy production data.

### Firestore migration rehearsal
Four new unit tests cover offline migration consistency, invalid snapshot rejection, derived query metadata, and emulator endpoint guard. One separate CI functional test uses the local Firestore emulator to import a reserved synthetic order, cancel it, create/replay another order and confirm stock. Results must be observed in CI; not a live service or full migration verification. No production data or credentials.
