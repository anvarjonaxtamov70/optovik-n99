# Ishga tushirish bo‘yicha qo‘llanma

Ilova **Firebase** (ma’lumotlar) va **GitHub** (sozlash va yangilash) bilan ishlaydi. Alohida server yoki oylik to‘lov kerak emas. Sizga 4 ta qadam qoladi, taxminan 20 daqiqa. Kalitlarni nusxalash qulay bo‘lgani uchun kompyuterda qilgan ma’qul.

> Hozirgi holat (tekshirildi): Firebase’da **Authentication yoqilmagan**, katalogda faqat «Mahsulot 1» va «Mahsulot 2» namunasi bor. Shuning uchun hozir ilovada buyurtma berib bo‘lmaydi. Quyidagi qadamlardan keyin hammasi ishlaydi.

## 1. Firebase Authentication (5 daqiqa)

[console.firebase.google.com](https://console.firebase.google.com) → **optovikn99** loyihasi.

1. **Build → Authentication → Get started** (ruscha: **Аутентификация → Начать**). ⚠ Majburiy.
2. **Sign-in method** bo‘limida ikkitasini yoqing:
   - **Anonymous** → Enable → Save. Mijozlar ro‘yxatdan o‘tmasdan buyurtma beradi.
   - **Email/Password** → Enable → Save. Bu faqat siz (admin) uchun.
3. **Users → Add user**: o‘zingizning emailingiz va kamida 8 belgili parol. Shu bilan ilovadagi boshqaruvga kirasiz.

## 2. Service account kaliti → GitHub (5 daqiqa)

1. Firebase → ⚙ **Project settings → Service accounts → Generate new private key**. `.json` fayl yuklanadi.
2. Faylni Bloknot bilan oching va **butun matnini** nusxalang.
3. GitHub → `optovik-n99` → **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `FIREBASE_SERVICE_ACCOUNT`
   - Secret: nusxalangan matn.

> ⚠ Bu kalit bazaning to‘liq kaliti. Uni hech kimga bermang va repozitoriyaga fayl qilib yuklamang.

## 3. «Firebase sozlash» amali (2 daqiqa)

GitHub → **Actions → Firebase sozlash → Run workflow**:
- `seed`: **auto** (katalog bo‘sh bo‘lsa 36 ta namuna GM tovari yuklanadi).
- `admin_email`: 1-qadamda yaratgan emailingiz.

**Run workflow** bosing. 1 daqiqadan keyin natija sahifasida ✅ belgilar chiqadi: qoidalar joylandi, kirish usullari yoqildi, namuna katalog yuklandi, siz admin bo‘ldingiz.

> Namuna tovarlarning narx va qoldiqlari **taxminiy**. Ularni ilovadagi Admin → Tovarlar bo‘limida o‘zingiznikiga almashtiring yoki o‘chiring. Haqiqiy tovarlar bo‘lsa, `auto` ularni hech qachon almashtirmaydi.

Agar «Authentication avtomatik yoqilmadi» degan ogohlantirish chiqsa — 1-qadamni tekshiring va amalni qayta ishga tushiring.

## 4. Expo Go’da sinash

GitHub → **Actions → Expo Go Publish → Run workflow**. Tugagach natija sahifasidagi **QR kod** havolasini oching va telefoningizdagi **Expo Go** bilan skanerlang.

`EXPO_TOKEN` secret allaqachon bor (oldingi nashr ishlagan). Yo‘q bo‘lsa: expo.dev → Account settings → Access tokens → yarating va GitHub Secrets’ga `EXPO_TOKEN` nomi bilan qo‘shing.

## Ilovani boshqarish

**Kabinet** → eng pastda **«Do‘kon egasi uchun»** → email va parol → **Do‘kon boshqaruvi**.

1. **Sozlamalar** — birinchi navbatda: telefon raqam (mijozlar qo‘ng‘iroq qiladi), Telegram, manzil, xaritadagi joy (Google/Yandex xaritadan `39.65, 66.96` ko‘rinishida), ish vaqti, yetkazish narxi, bepul yetkazish chegarasi, MCHJ nomi va STIR.
2. **Tovarlar** — yangi tovar, narx, eski narx (aksiya belgisi va «−N%» o‘zi chiqadi), qoldiq, artikul, mos modellar (`Cobalt, Gentra` yoki `Universal`), rasmlar.
3. **Bannerlar** — o‘z bannerlaringizni qo‘shsangiz, tayyor 4 ta banner o‘rnini egallaydi.
4. **Buyurtmalar** — yangi buyurtma kelganda ilovada xabar chiqadi.

**Buyurtma jarayoni:** Yangi → mijozga qo‘ng‘iroq → **Tasdiqlash** (qoldiq shu paytda ayriladi) → **Yo‘lda** (kuryer) yoki **Olib ketishga tayyor** → **Yetkazildi**. Bekor qilsangiz, ayrilgan qoldiq omborga qaytadi. Mijoz faqat tasdiqlanmagan buyurtmani bekor qila oladi.

### Telefondan rasm yuklash (ixtiyoriy, bepul)

1. [cloudinary.com](https://cloudinary.com) da bepul hisob oching. Dashboard’dagi **Cloud name** ni yozib oling.
2. **Settings → Upload → Upload presets → Add upload preset**: Signing mode — **Unsigned**, Folder — `n99`. Saqlang va preset nomini yozib oling.
3. Ilovada Admin → Sozlamalar → «Rasm yuklash» ga ikkalasini kiriting. Endi tovar sahifasida **Telefondan yuklash** ishlaydi.

Cloudinary ulanmasa ham tovarga rasm **havolasini** (`https://…`) qo‘shish mumkin.

## Keyingi qadamlar

1. **Haqiqiy tovarlar va rasmlar.** Bu eng muhimi: chiroyli rasm sotuvni oshiradi. Rasmi yo‘q tovarda kategoriya belgisi ko‘rinadi.
2. **Payme, Click, Uzum Bank.** MCHJ bilan har biriga merchant shartnoma tuziladi (payme.uz/business, click.uz → «Biznesga»). Ular `merchant_id` va maxfiy kalit beradi. Onlayn to‘lov uchun kichik server kerak — Avto A1 Optom’dagi kabi bepul **Cloudflare Worker**: to‘lov tizimi pul tushganini shu serverga xabar qiladi, server buyurtmani «to‘landi» qiladi. Kalitlarni olgach menga yozing — shu ilovaga ulab beraman. Ilovada to‘lov joyi tayyor («Tez orada»).
3. **SMS orqali kirish** (Eskiz.uz, MCHJ bilan shartnoma). Hozir mijoz hisobi telefonga bog‘langan (anonim). SMS qo‘shilsa, ilovani qayta o‘rnatgan mijoz ham buyurtmalar tarixini ko‘radi.
4. **Push-xabarlar.** Sizga — yangi buyurtma, mijozga — holat o‘zgarganda. Bu ham Worker orqali qilinadi.
5. **Play Market va App Store.**
   - Google Play Console — bir martalik 25$; Apple Developer — yiliga 99$ (MCHJ nomidan D-U-N-S raqami bilan).
   - Qurish: `npx eas-cli@latest build --platform android --profile production` (Android uchun `.aab`), iOS uchun `--platform ios`. Expo serverida quriladi, kompyuterda Android Studio yoki Xcode shart emas.
   - Do‘konlar maxfiylik siyosati havolasini so‘raydi. Matn ilovada bor (Kabinet → Maxfiylik siyosati); uni saytga yoki GitHub Pages’ga joylab, havolasini bering.
   - Native modul qo‘shilsa (masalan, to‘lov SDK), Expo Go o‘rniga **development build** kerak bo‘ladi: `npx eas-cli@latest build --profile development`.
6. **Zaxira nusxa.** Firebase → Realtime Database → ⋮ → **Export JSON** — oyiga bir marta.

## Bilish kerak bo‘lgan cheklovlar

- Buyurtma summasidagi narxlarni server katalog bilan solishtiradi. `jami` maydonini server qayta hisoblay olmaydi (bepul tarifda server kodi yo‘q), shuning uchun admin ekranida summa tovarlardan qayta hisoblanadi va mos kelmasa ogohlantirish chiqadi. Naqd to‘lovda bu yetarli; onlayn to‘lovda summa Worker’da tekshiriladi.
- Qoldiq buyurtma berilganda emas, **siz tasdiqlaganingizda** ayriladi. Bir dona qolgan tovarni ikki kishi buyurtma qilsa, ikkinchisini tasdiqlashda «Omborda yetarli qoldiq yo‘q» chiqadi.
- Mijoz hisobi qurilmaga bog‘langan: ilovani o‘chirib qayta o‘rnatsa, eski buyurtmalar ro‘yxati ko‘rinmaydi (buyurtmalar sizda saqlanadi).
