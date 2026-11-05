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
5. Internetni uzing, ilovani to‘liq yopib qayta oching: saqlangan katalog va savat ko‘rinsin, ulanish holati chiqsin, yangi miqdor/buyurtma bloklansin. Qayta ulang, jonli narx/qoldiq kelgach xarid ochilsin.
6. Server yoqilmagan holatda buyurtma xizmati ochiq deb ko‘rsatilmasin. Katalog/savat ishlashi davom etsin.
7. Server yoqilgach email hisob yarating, xatni tasdiqlang, profilni saqlang. Hisobdan chiqib qayta kiring. Boshqa hisob avvalgisining profil/buyurtmasini ko‘rmasin.
8. Buyurtma bering. Ikki qurilma bir dona qolgan mahsulotni olsa faqat biri o‘tsin. Admin ro‘yxatida bir marta ko‘rinsin.
9. Javob kelayotganda aloqani uzing, ilovani qayta oching. «Buyurtma holatini tekshirish» o‘sha urinishdan foydalansin. Dublikat buyurtma bo‘lmasin.
10. Mijoz faqat kutilayotgan o‘z buyurtmasini bekor qilsin. Admin qabul → yo‘lda → yetkazildi holatlarini o‘tkazsin. Takror bosish stok yoki cashbackni ikki marta o‘zgartirmasin.
11. Admin mahsulotni tahrirlayotganda boshqa qurilmadan buyurtma bering. Eski qoldiqni saqlash rad etilsin.
12. iPhone safe area, Android back tugmasi, klaviatura, katta shrift va kichik ekranlarda tekshiring.

Bu qo‘lda sinovlar qurilmada hali bajarilmagan bo‘lsa, CI o‘tganini ularning o‘rniga ishlatmang.

## Bosh ekran regressiyasi

- Bosh ekrandan tovarni savatga qo‘shing: pastki badge va Savat sahifasidagi miqdor bir xil bo‘lsin. Sevimlilarga saqlash Sevimlilar sahifasida ham aks etsin.
- Haqiqiy eski narx 100 000, yangi narx 85 000 bo‘lsa −15% ko‘rinsin. Eski narxni olib tashlaganda belgi va chizilgan narx yo‘qolsin. Chegirma namuna sifatida katalogga yozilmaydi.
- Qidiruvga nom, artikul va model so‘zlarini birga yozing; klaviatura har harfda yopilmasin. Tozalaganda katalog qaytsin.
- GM va aksessuar bannerlari tegishli bo‘limni tanlasin. Barchasi eski tasniflanmagan katalogni ham ko‘rsatsin.
- Narxni o‘sish/kamayish tartibida saralash, mavjud mahsulotlar, aksiyalar filtri va ularni tozalashni tekshiring. Android Back filtr oynasini yopsin.
- Tarozi orqali ikkita tovar tanlab Taqqoslashni oching; haqiqiy narx, artikul, model va qoldiq ko‘rinsin. Uchinchi tovar tanlanmasin; birini olib tashlagach yangisi tanlansin.
- Internetsiz katalog saqlangan bo‘lsa ko‘rinsin, savatga qo‘shish o‘chsin. Rasm URL xato bo‘lsa placeholder chiqsin. Qoldiq 0 bo‘lganda Tugagan yozilsin.
- 320/360 px va iPhone 17 Pro Max ekranida, katta tizim shriftida, gorizontal aylantirganda ham narx va tugmalar sig‘sin; katta shriftda panjara bitta ustunga o‘tsin.
- iOS menyusida blur, Android’da shaffof fon va soyalarni haqiqiy qurilmada tekshiring. Web eksport native qurilma sinovining o‘rnini bosmaydi.
