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
3. Qidiruv: `cobalt kolodka`, `кобальт колодка`, `N99 4001`. Natija chiqsin; oxirgi qidiruvlar saqlansin.
4. Mashinani tanlang (qidiruv yonidagi mashina tugmasi) → bosh sahifada «Cobalt uchun», tovar sahifasida «Cobalt ga mos keladi».
5. Kartada **Savatga** → miqdor tanlagichga aylanadi, pastki menyudagi savat soni «sakraydi». Qoldiqdan ko‘p qo‘shib bo‘lmasin.
6. Savat: belgini olib tashlang — jami kamaysin; o‘chiring → «Qaytarish»; ilovani yopib oching — savat saqlangan bo‘lsin.
7. Rasmiylashtirish: olib ketish va kuryer; noto‘g‘ri telefon/bo‘sh ism xato ko‘rsatsin. Buyurtma bering → yashil belgi va konfetti, buyurtma raqami.
8. Buyurtmalarim: holat chizig‘i; admin holatni o‘zgartirsa ekran o‘zi yangilansin. «Bekor qilish» faqat tasdiqlanmaguncha.
9. Til: Kabinet → Til → Русский — barcha matnlar ruscha.
10. Admin: Kabinet → «Do‘kon egasi uchun» → kiring → buyurtmani tasdiqlang → tovar qoldig‘i kamaysin; bekor qiling → qaytsin. Tovar narxini o‘zgartiring → mijoz ekranida darhol yangilansin.
11. Internetni o‘chiring: saqlangan katalog ko‘rinsin, «Internet yo‘q» xabari, savatga qo‘shish o‘chiq bo‘lsin.
12. iPhone (qosh/Dynamic Island), Android orqaga tugmasi, katta shrift, klaviatura ochilganda maydonlar yopilib qolmasin.
