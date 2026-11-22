# OPTOVIK N99 — ish reja

Tekshirilgan sana: 2026-11-21. Holat: `typecheck`, `lint`, 14 ta unit test o‘tdi. Web versiya (`expo export --platform web`) yig‘iladi va ochiladi, jonli bazadan 31 ta tovar keladi, lekin ko‘rinish telefon uchun mo‘ljallangan.

## Qarorlar (do‘kon egasi bilan kelishilgan)
- Do‘kon hisoblari **MCHJ** nomidan ochiladi → Google Play’da 12 testerli 14 kunlik sinov talab qilinmaydi; Apple uchun D-U-N-S raqami kerak.
- Web (noutbuk) versiya **faqat adminlar uchun**. Mijozlar telefondagi ilovadan foydalanadi.
- Web manzil: bepul `optovikn99.web.app` (Firebase Hosting).
- Rasm yuklash: **ImgBB** (Cloudinary olib tashlandi).
- Excel/CSV import — keyinroq.

## Bajarilish holati
- [x] 1-bosqich (Excel’siz) — `feat/admin-tovar-qoshish` PR.
- [x] 2-bosqich — web admin paneli + hosting (`feat/web-admin-panel` PR).
- [x] 3-bosqich — dizayn (`feat/dizayn-mukammal` PR).
- [x] 3.1 — tugmalar bosilishi, nozik soyalar, likillaydigan animatsiyalarni olib tashlash (`feat/animatsiya-soya` PR).
- [ ] 4-bosqich — do‘konlarga chiqish.
- [ ] Excel/CSV import va eksport.

## Tekshiruvda topilgan asosiy muammolar

### Tovar qo‘shish (admin)
1. Web’da (noutbukda) **tovarni o‘chirib bo‘lmaydi**: `Alert.alert` brauzerda ishlamaydi (`AdminProductEdit.tsx:107`). Banner o‘chirish (`AdminBanners.tsx:96`), buyurtmani bekor qilish (`AdminOrder.tsx:87`, `OrderScreen.tsx:54`), savatdan tanlanganlarni o‘chirish (`CartScreen.tsx:75`) ham shunday.
2. Web’da Cloudinary orqali rasm yuklash ishlamaydi: `uploadImage` FormData’ga `{uri,name,type}` obyekt beradi, bu faqat telefonda ishlaydi (`state/admin.ts`).
3. **ImgBB kaliti hammaga ochiq**: `settings/shop` hamma uchun o‘qiladi (`database.rules.json`), kalit shu yerda. Har qanday odam sizning hisobingizga rasm yuklay oladi.
4. Bir vaqtda bitta rasm tanlanadi, rasmlar tartibini (asosiy rasmni) o‘zgartirib bo‘lmaydi, rasmni sudrab tashlash (drag & drop) yo‘q.
5. Tovar nusxalash, «Saqlash va yana qo‘shish», saqlanmagan o‘zgarishlar haqida ogohlantirish yo‘q.
6. Tovarlar ro‘yxatida kategoriya filtri, jadval ko‘rinishi, joyida narx/qoldiq o‘zgartirish yo‘q (`quickStock` funksiyasi yozilgan, lekin ishlatilmagan).
7. Ommaviy yuklash (Excel/CSV import va eksport) yo‘q — ko‘p tovar uchun eng katta vaqt yo‘qotish.
8. Jonli katalogda sinov tovari bor («Tttt», −90%, begona rasm), ko‘p tovarda rasm yo‘q.

### Noutbuk (web) ko‘rinishi
- Ro‘yxatlar chapga yopishgan, o‘ng tomon bo‘sh; sarlavha va pastki tugmalar butun ekran bo‘ylab cho‘zilgan.
- Banner karuseli kesilgan holda ko‘rinadi; gorizontal lentalar, tovar rasmlari galereyasi sichqoncha bilan aylanmaydi (strelka yo‘q).
- Pastki tab menyu kompyuterda noqulay; yuqori menyu kerak.
- Soyalar web’da chiqmaydi (`tokens.ts` faqat `elevation`), hover holatlari yo‘q.
- Ulashish va qo‘ng‘iroq tugmalari kompyuterda hech narsa qilmaydi.
- Web versiya hech qayerga joylanmagan (hosting yo‘q).

### Dizayn kamchiliklari
- Ranglar va shriftlar `tokens.ts` dan tashqarida yozilgan (≈20 joy), `space` tokenlari ishlatilmaydi, oraliqlar tartibsiz.
- 44px dan kichik bosiladigan joylar (stepper, yopish, «Yana», nusxalash va boshqalar).
- i18n’dan tashqari matnlar: `ProductCard` (Yangi/Universal), `Sheet` ('Close'), admin sozlamalari, banner mavzulari xom kalit ko‘rinishida ('sunrise', 'gm').
- Yuklanish/xato holatlari: qidiruvda katalog yuklanayotganda «topilmadi», sevimlilarda bo‘sh holat, admin buyurtmalarida xato ko‘rsatilmaydi.
- «Joylashuv» tugmasi pastga strelka bilan, lekin tanlov ochmaydi; Home’dagi «yangilash» spinner ko‘rsatmaydi.
- Rasmlarni kattalashtirish (zoom) yo‘q.

### App Store / Play Market to‘siqlari
- Ilova ichida **hisob va ma’lumotlarni o‘chirish** yo‘q (Google Play va Apple talab qiladi).
- Maxfiylik siyosatining **ochiq havolasi** yo‘q; matnda xatolar bor («buyurtmalar qurilmada saqlanadi» — aslida Firebase’da).
- To‘lovda «Tez orada» qatorlari (Apple tugallanmagan funksiyani rad etadi).
- Admin kirish oynasi hamma mijozga ko‘rinadi.
- `supportsTablet: true` — iPad skrinshotlari va iPad’da sifatli ko‘rinish talab qilinadi.
- `eas.json` da submit sozlamalari bo‘sh; do‘kon rasmlari, tavsiflari, kontent reytingi, Data safety / App Privacy anketalari tayyorlanmagan.

## Bosqichlar

### 1-bosqich. Admin: tovar qo‘shishni tuzatish va qulaylashtirish ✅
1. `confirmAsync()` (web’da `window.confirm`, telefonda Alert): admin bo‘limidagi o‘chirish va bekor qilish brauzerda ishlaydi.
2. Rasm: ImgBB orqali bir nechtasini birdan tanlash (10 tagacha), brauzerda sudrab tashlash va Ctrl+V, tartibni ‹ › bilan o‘zgartirish, havolani Enter bilan qo‘shish.
3. ImgBB kaliti `settings/private` da (faqat admin o‘qiydi); admin kirganda eski ochiq joydan avtomatik ko‘chiriladi. Qoidalar + emulator testlari.
4. Forma: kompyuterda ikki ustun, «Saqlash va yana qo‘shish», «Nusxa olish», saqlanmagan o‘zgarish ogohlantirishi, Ctrl+S; havola bilan ochilganda katalog yuklanguncha bo‘sh forma ko‘rsatilmaydi.
5. Tovarlar ro‘yxati: kategoriya, «Tugagan», «Kam qolgan», «Aksiyalar», «Rasmsiz» filtrlari; kompyuterda jadval, joyida narx va qoldiq tahriri (revision bilan).
6. CSV/Excel import va eksport — keyinga qoldirildi.

### 2-bosqich. Noutbuk uchun web admin paneli ✅
Web faqat adminlar uchun bo‘lgani sababli do‘kon sahifalarini kompyuterga moslash shart emas.
Bajarildi: `/admin` va `/info/*` dan boshqa sahifalar web’da `/admin` ga yo‘naltiriladi; web’da intro va mijoz uchun anonim hisob yo‘q; chap menyu (yangi buyurtmalar soni, brauzer yorlig‘ida ham); bosh sahifa, buyurtmalar (2 ustun), buyurtma (2 ustun, «Raqamni nusxalash»), sozlamalar (2 ustun), bannerlar keng ekranga moslandi; web soyalari; `firebase.json` hosting (SPA, kesh, xavfsizlik sarlavhalari, `noindex`) va «Web admin panel» GitHub amali.
1. Web’da bosh sahifa → `/admin` ga yo‘naltirish; mijoz sahifalari web’da ochilmaydi (maxfiylik siyosati va «ma’lumotni o‘chirish» sahifalari bundan mustasno — ular do‘konlar uchun ochiq havola bo‘ladi).
2. Kompyuterda chap menyuli admin paneli (Buyurtmalar, Tovarlar, Bannerlar, Sozlamalar), intro animatsiyasi web’da o‘chiriladi.
3. Buyurtmalar, bannerlar va sozlamalar sahifalarini keng ekranga moslash; web soyalari va hover.
4. Firebase Hosting (bepul, `optovikn99.web.app`) + GitHub Actions orqali avtomatik joylash. Firebase Auth’da domenni ruxsat etish.

### 3-bosqich. Dizayn ✅
- Ranglar va shriftlar faqat `theme/tokens.ts` dan (yangi tokenlar: `info`, `gold`, `scrim`, `toast*`, `onBrand*`, `viewerBg`, `artTones`). Web soyalari.
- Bosiladigan joylar ≥ 44 px: tugmalar (`Button` sm 38→44), savatdagi `+/−`, «Savatga», varaq yopish, qidiruvni tozalash, joylashuv va qo‘ng‘iroq.
- i18n’dan tashqari matnlar yo‘q: «Universal», «Yangi», «Close», «STIR / ИНН», banner rangi va rasmi (xom `sunrise`, `gm` o‘rniga nomlar). Ishlatilmaydigan kalitlar o‘chirildi.
- Holatlar: tovar sahifasi va qidiruvda yuklanish skeletoni, saralanganlarda skeleton, buyurtmalarda xato holati, topilmagan buyurtma uchun tushuntirish va chiqish yo‘li.
- Rasmni to‘liq ekranda ko‘rish: barmoqlar bilan kattalashtirish, ikki marta bosish, surish, varaqlash, hisoblagich (`ImageViewer`).
- Pastga tortib yangilashda haqiqiy aylanuvchi belgi; «Samarqand» tugmasidagi yolg‘on strelka o‘rniga aniq belgi.
- To‘lovdagi «Tez orada» qatorlari olib tashlandi (Apple tugallanmagan funksiyani rad etadi); maxfiylik va savol-javob matni to‘g‘rilandi (buyurtmalar serverda saqlanadi, saqlash muddati yozildi).
- Telefon ilovasidan admin kirishi olib tashlandi; `supportsTablet: false` (faqat iPhone).

### 3.1. Harakat va soyalar ✅
Do‘kon egasining fikri: tugmalar bosilganda «tirik» tursin, nozik soyalar bo‘lsin, likillaydigan animatsiya yo‘qolsin, arzon telefonda ham silliq ishlasin.
- Bosilish: tez botish + prujinadek qaytish, ustki qatlam biroz qorayadi; karta soyasi bilan birga siqiladi; ro‘yxat qatorlari tus oladi.
- Soyalar: yangi `shadow.xs`, `buttonSm`, `danger`; mavjudlari yumshatildi; soyali ko‘rinishlar shaffof bo‘lmagan fonli.
- Olib tashlandi: skeletondagi yaltiroq chiziq, bo‘sh holatdagi «nafas oluvchi» halqa, buyurtma holatidagi pulsatsiya, bannerdagi tebranuvchi «%», introdagi yonib-o‘chish, bo‘limlar orasidagi yarim shaffof o‘tish, ro‘yxatda kartalarning birma-bir chiqishi.
- Qoidalar: `docs/DESIGN.md` → «Harakat va soya qoidalari».

### 4-bosqich. Do‘konlarga chiqish
1. Kod: «Ma’lumotlarimni o‘chirish» (ilovada + ochiq web sahifa), maxfiylik siyosatini web’da ochiq havola qilish, `eas.json` submit sozlamalari. («Tez orada» to‘lovlar, admin kirishi va iPad 3-bosqichda hal qilindi.)
2. Hisoblar: Google Play Console (bir martalik 25$), Apple Developer (yiliga 99$; MCHJ nomidan bo‘lsa D-U-N-S raqami kerak).
3. Hisoblar MCHJ nomidan: Google Play’dagi 12 testerli 14 kunlik yopiq test talabi (faqat shaxsiy hisoblar uchun) bizga tegishli emas, lekin tashkilot hisobini tasdiqlash uchun D-U-N-S raqami va hujjatlar so‘raladi. Apple ham MCHJ uchun D-U-N-S talab qiladi (bepul, lekin olish bir necha hafta cho‘zilishi mumkin — oldindan boshlash kerak).
4. Materiallar: ikona 1024×1024, Play uchun 1024×500 banner, telefon (va iPad) skrinshotlari, qisqa va to‘liq tavsif (uz/ru), kontent reytingi, Data safety va App Privacy anketalari, qo‘llab-quvvatlash havolasi.
5. Qurish va yuborish: `eas build --profile production` → `eas submit`; TestFlight va Play ichki testi orqali sinov.

### Bilish kerak bo‘lgan xavf
O‘zbekiston qonuniga ko‘ra fuqarolarning shaxsiy ma’lumotlari O‘zbekistondagi serverlarda saqlanishi kerak; hozir Firebase europe-west1 da. Bu bo‘yicha yurist bilan maslahatlashish tavsiya etiladi.
