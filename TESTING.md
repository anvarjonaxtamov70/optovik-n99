# Telefonda tekshirish

1. Windows PowerShell’da `npx.cmd expo start --clear` buyrug‘ini ishga tushiring. Telefon va kompyuter bir Wi-Fi’da bo‘lsin. QR-kodni iPhone’da Kamera orqali, Android’da Expo Go orqali oching. LAN ishlamasa, mavjud ngrok bilan `npx.cmd expo start --tunnel` ishlating.
2. Mahsulot nomini katta-kichik harflar va chetida bo‘shliqlar bilan kiriting: masalan, `  MAHSULOT 1  `. Mavjud bo‘lmagan nom uchun «Mahsulot topilmadi» xabari chiqishini tekshiring.
3. Kategoriyalar va «Barchasi» tugmasini almashtiring. Qidiruv tanlangan kategoriya ichida ishlashini, tozalash tugmasini tekshiring.
4. Mahsulotni bir necha marta «Savatga» qo‘shing. Pastki menyudagi son jami dona soniga teng bo‘lsin. Katalog va Savat orasida o‘tganda savat saqlansin.
5. Savatda `+`, `−`, «Olib tashlash», har bir mahsulot summasi va jami narxni tekshiring. `+` qoldiq chegarasida, `−` esa bir donada o‘chadi. Qoldig‘i 0 bo‘lgan mahsulot qo‘shilmaydi.
6. Jonli yangilanishni o‘zingiz boshqaradigan test mahsulotida tekshiring: narx o‘zgarsa jami ham o‘zgaradi; qoldiq savatdagi miqdordan pasaysa savat moslashib xabar ko‘rsatadi; qoldiq 0 bo‘lsa yoki mahsulot o‘chirilsa u savatdan olinadi.
7. iPhone’da notch va pastki home indicator, Android’da tizim paneli bilan ustma-ust tushmasligini tekshiring. Klaviatura ochilganda qidiruv, ro‘yxatni aylantirish va katta shriftni tekshiring.

Savat hozir xotirada ishlaydi: ilova to‘liq qayta ochilganda tozalanadi. Ilova Firebase’dan faqat `tovarlar`ni o‘qiydi; savat amallari buyurtma yoki qoldiq yozmaydi.

Avtomatik tekshiruvlar: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`. Testlar Node.js 22.18+ ning TypeScript o‘qish imkoniyatidan foydalanadi va jonli bazaga ulanmaydi.
