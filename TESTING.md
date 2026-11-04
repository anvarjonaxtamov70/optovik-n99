# Tekshirish

## Avtomatik

```sh
npm ci
npm run typecheck
npm run lint
npm test
```

Node 22.18+ yoki 24 kerak. Sof sinovlar internet va Firebase tokenisiz ishlaydi. `tests/commerce.test.mjs` narx, stok, butun buyurtmani bekor qilish, idempotency, status vakolati, cashback va admin tahrirlash to‘qnashuvini tekshiradi.

GitHub Actions qo‘shimcha Android/iOS bundle hamda Auth + RTDB + Functions emulyatorida haqiqiy HTTP buyurtma va rules testlarini bajaradi. Emulyator testini production project bilan ishlatmang:

```sh
npm --prefix functions install
npx firebase-tools emulators:exec --only auth,database,functions --project demo-optovik "node tests/emulator.mjs"
```

## Telefonda qo‘lda

1. Expo Go: nom/artikul/model bilan qidiring, bo‘lim/mavjud/aksiya filtrlarini va narx saralashni tekshiring.
2. Mahsulotni oching. Rasm yo‘q yoki HTTPS rasm ochilmay qolsa fallback ko‘rinishi kerak. Matnlar katta fontda kesilmasin.
3. Sevimlilar va savatga qo‘shing. Ilovani to‘liq yoping, qayta oching. Ikkalasi tiklansin.
4. Firebase’da test tovar narxini/qoldig‘ini o‘zgartiring. Savat summasi va soni yangilansin. Nol qoldiqni qo‘shib bo‘lmasin.
5. Internetni uzing: ulanish holati chiqsin, savat saqlansin, yangi miqdor/buyurtma bloklansin. Qayta ulang.
6. Server yoqilmagan holatda buyurtma xizmati ochiq deb ko‘rsatilmasin. Katalog/savat ishlashi davom etsin.
7. Server yoqilgach email hisob yarating, xatni tasdiqlang, profilni saqlang. Hisobdan chiqib qayta kiring. Boshqa hisob avvalgisining profil/buyurtmasini ko‘rmasin.
8. Buyurtma bering. Ikki qurilma bir dona qolgan mahsulotni olsa faqat biri o‘tsin. Admin ro‘yxatida bir marta ko‘rinsin.
9. Javob kelayotganda aloqani uzing, ilovani qayta oching. «Buyurtma holatini tekshirish» o‘sha urinishdan foydalansin. Dublikat buyurtma bo‘lmasin.
10. Mijoz faqat kutilayotgan o‘z buyurtmasini bekor qilsin. Admin qabul → yo‘lda → yetkazildi holatlarini o‘tkazsin. Takror bosish stok yoki cashbackni ikki marta o‘zgartirmasin.
11. Admin mahsulotni tahrirlayotganda boshqa qurilmadan buyurtma bering. Eski qoldiqni saqlash rad etilsin.
12. iPhone safe area, Android back tugmasi, klaviatura, katta shrift va kichik ekranlarda tekshiring.

Bu qo‘lda sinovlar qurilmada hali bajarilmagan bo‘lsa, CI o‘tganini ularning o‘rniga ishlatmang.
