# Buyurtma serverini yoqish

Jonli loyiha: **optovikn99**. Avto A1’ning bazasi, mijozlari va botlariga tegilmaydi. Amaldagi katalog `tovarlar` ichida qoladi.

## 1. Firebase sozlamalari

- Authentication → Email/Password provayderini yoqing. Parol siyosatida kamida 8 belgini belgilang, email enumeration protection’ni yoqing.
- Tasdiqlash/parol tiklash xatlari uchun o‘z domeningiz va jo‘natuvchi nomini sozlang.
- Cloud Functions deploy uchun Blaze billing kerak. Xarajat hisobini egasi yoqadi; kod buni avtomatik qilmaydi.
- Rules o‘zgarishidan oldin Realtime Database’ni Firebase Console’dan eksport qilib zaxira oling. Root’ga `database:set` buyrug‘i ishlatmang.

## 2. Server va rules

Ishonchli kompyuterda Firebase CLI bilan o‘z hisobingizga kiring. Service account yoki tokenni ilova/GitHub kodiga qo‘ymang.

```sh
npm --prefix functions install
npx firebase-tools login
npx firebase-tools deploy --only functions:commerce,database --project optovikn99
```

Uchta callable `europe-west1`da ishlaydi: `createOrder`, `changeOrderStatus`, `saveProduct`. `.firebaserc` shu loyihaga bog‘langan. `database.rules.json` katalogni ommaviy o‘qishga ruxsat beradi; buyurtma, stok va balansga klient yozuvi yopiq. Profilni faqat egasi tahrirlaydi.

## 3. Admin

Avval ilovada email bilan hisob yarating va emailni tasdiqlang. Firebase Authentication’dan UID oling. Ishonchli admin muhiti va Application Default Credentials orqali:

```sh
cd functions
node set-admin.mjs FIREBASE_UID
```

Faqat hisob egasiga admin claim bering. Ilovadan chiqib qayta kiring. UID yoki emailni mobil kodga hardcode qilish admin vakolati bermaydi.

## 4. Savdo sozlamalari

Firebase Console’da faqat `settings/commerce` tugunini kiriting. Root ustiga yozmang.

```json
{
  "courierEnabled": false,
  "shippingFee": 0,
  "cashbackBps": 0
}
```

Cashback standartda o‘chiq. `80` — 0.8%; `100` — 1%. 0–1000 basis point ruxsat etiladi. Faqat admin naqd to‘lov olinganini tasdiqlab «Yetkazildi» deganda bonus beriladi. Buyurtma berishda balansning ko‘pi bilan mahsulotlar summasining 20% ishlatiladi. Qaytarishda sarflangan bonus tiklanadi, topilgan bonus ayiriladi; allaqachon sarflangan bonus bo‘lsa balans manfiy bo‘lishi mumkin, qayta sarflash nolga cheklanadi.

Yetkazishni yoqishdan oldin qat’iy `shippingFee`ni kiriting. Hududga qarab tariflash hozir yo‘q. `false` holatda faqat do‘kondan olish taklif etiladi.

## 5. Mobil ilovada yoqish

`.env.example`ni `.env.local`ga nusxalang va `EXPO_PUBLIC_COMMERCE_ENABLED=true` qiling. Expo’ni qayta boshlang. Bu bayroq maxfiy kalit yoki server himoyasi emas; server har doim Firebase tokeni va vakolatni tekshiradi.

Avval sinov hisobida: kirish → profil → savat → buyurtma → admin tasdiqlashi → yetkazish → bekor/qaytarish. Keyin haqiqiy mijozlarni taklif qiling.

## Chegaralar va keyingi nashr

- Hozir mavjud RTDB katalogini saqlash uchun stok, buyurtma va balans **bitta root transaction**da yangilanadi. Bu bitta kichik do‘konda atomiklik beradi, lekin baza katta bo‘lganda har buyurtma butun daraxtni qayta ishlaydi. Katta oqimdan oldin inventory/order ma’lumotlarini transaction uchun alohida commerce daraxtiga ko‘chirish yoki Firestore transaction modeliga migratsiya qilish kerak. Admin buyurtma ro‘yxati oxirgi 100 yozuv bilan cheklangan.
- Har hisobga 3 buyurtma/minut va 20/kun. Bu to‘liq anti-abuse o‘rnini bosmaydi. Ishlab chiqarish buildida App Check va monitoringni sozlang.
- Rasm maydoni hozir HTTPS URL. Rasm faylini yuklash/storage boshqaruvi alohida integratsiya.
- Telefon mijoz kiritgan aloqa raqami; SMS orqali tasdiqlangan hisoblanmaydi.
- Push xabarlari yo‘q. Buyurtma holati ilova ochiq bo‘lganda jonli yangilanadi.
- Ommaviy store nashridan oldin haqiqiy do‘kon aloqa ma’lumotlari, maxfiylik siyosati URL’i, hisobni o‘chirish oqimi, signing va store ma’lumotlari kerak. Email/parol va manzillarni ishlatish siyosatini egasi tasdiqlaydi.
