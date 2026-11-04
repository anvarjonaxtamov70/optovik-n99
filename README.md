# OPTOVIK N99

Android va iPhone uchun mustaqil ehtiyot qismlar do‘koni. Expo SDK 58 + React Native + Expo Router, Firebase Realtime Database va Firebase Auth. Telegram SDK, bot, login yoki xabar yuborish bog‘liqligi yo‘q.

## Ishlaydigan oqimlar

- Katalog: bo‘lim, nom/artikul/model qidiruvi, mavjud mahsulotlar, aksiyalar, narx bo‘yicha saralash.
- Mahsulot sahifasi: HTTPS rasm, tavsif, artikul, model va jonli qoldiq. Eski `tovarlar/kategoriya/id/{nomi,narxi,qoldiq}` bazasi saqlanadi.
- Sevimlilar va savat telefonda saqlanadi. Narx va qoldiq bazadan qayta tekshiriladi.
- Email/parol hisobi, email tasdiqlash, parol tiklash, profil va manzil.
- Naqd to‘lovli buyurtma, tarix, holat kuzatuvi va kutilayotgan buyurtmani bekor qilish.
- Admin: mahsulot yaratish/tahrirlash, qoldiq, narx, aksiya, buyurtmalar va holatlar.
- Server: narx/qoldiq tekshiruvi, atomik band qilish, qayta yuborishda bir xil buyurtma, bekor qilish/qaytarishda bir marta stok tiklash, cashback.

**Holat:** mobil va server kodi PR’da. Jonli buyurtma qabul qilish server joylanmaguncha o‘chiq. `.env.example`dagi bayroq shuning uchun `false`. Bu kodni joylamasdan tayyor savdo xizmati deb hisoblamang.

## Ishga tushirish

Node 22.18+ yoki 24. Paketlarni o‘rnatgach:

```sh
npm ci
npx expo start
```

Telefon va kompyuter bir tarmoqda bo‘lsin. Tunnel kerak bo‘lsa, SDK 58 Expo hisobi orqali `npx expo start --tunnel` yoki muqobil `npx expo start --tunnel ngrok`. CLI chiqargan QR’ni Expo Go’da oching.

```sh
npm run typecheck
npm run lint
npm test
```

Serverni yoqish: [DEPLOYMENT.md](DEPLOYMENT.md). Qo‘lda sinash: [TESTING.md](TESTING.md). Avto A1’dan olingan funksional reja: [docs/AVTO_A1_REVIEW.md](docs/AVTO_A1_REVIEW.md).

## Paketli ilova

`eas.json` Android APK preview va production profillarini beradi. Expo loyihasini o‘z hisobingizga bog‘lash, Android/iOS signing va store hisoblari alohida kerak. Bu PR o‘zi APK/IPA yoki App Store nashri yaratmaydi.

## Hozircha kirmagan funksiyalar

Click/Payme va karta to‘lovi, SMS login, push xabarlar, sharhlar, stories, AI yordamchi, yutuqlar hamda eski mijozlarni avtomatik ko‘chirish qo‘shilmagan. Ular mavjud bo‘lgandek ko‘rsatilmaydi. Asosiy savdo oqimi mustaqil ilova sifatida qurilgan.
