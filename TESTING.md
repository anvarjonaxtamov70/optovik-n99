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
FIREBASE_DATABASE_EMULATOR_HOST=127.0.0.1:9000 FIREBASE_DB_NAMESPACE=optovikn99-default-rtdb npm run firebase:setup
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
