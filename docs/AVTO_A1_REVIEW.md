# Avto A1 → OPTOVIK N99

O‘qilgan manba: `anvarjonaxtamov70/Avto_A1`, `2377296b78df3719ed09d8dda3cb5d004c52598d`.

README, modul xaritasi, funksiyalar xaritasi, asosiy index.html’dagi katalog/karta/mahsulot/savat/checkout kodlari, worker buyurtma shartnomasi, bot order_ops va Android Capacitor sozlamalari ko‘rib chiqildi. Bu barcha 46 ming qatorning bajarilishi audit qilindi degani emas.

Avto A1 asosiy interfeysi taxminan 2.8 MB bitta HTML faylga to‘plangan. Android qobig‘i o‘sha GitHub Pages saytini ochadi. Hozirgi OPTOVIK N99 React Native ekranlari va Expo Router navigatsiyasidan foydalanadi; HTML, DOM, bot autentifikatsiyasi yoki WebView ko‘chirilmagan.

| Avto A1’dagi vazifa | Mustaqil ilovadagi yechim |
| --- | --- |
| Katalog, bo‘lim, model/artikul qidiruvi | Native FlatList, kategoriya, ko‘p so‘zli qidiruv va saralash |
| Mahsulot, rasm, tavsif, qoldiq | Alohida navigatsiya sahifasi, mavjud RTDB katalogiga qo‘shimcha maydonlar |
| Sevimlilar, savat | AsyncStorage, qayta ochilganda tiklash, qoldiq bilan moslashtirish |
| Telegram orqali shaxsni aniqlash | Firebase email/parol va email tasdiqlash |
| Profil/manzil | Faqat hisob egasi o‘qiydigan va yozadigan profil |
| Buyurtma va botga xabar | Callable server buyurtmasi va ilova ichidagi tarix/holat |
| Stock-commit, duplicate attempt | Bitta atomik transaction, UIDga bog‘langan urinish identifikatori |
| Admin tugmalari | Ilovadagi server vakolati bilan himoyalangan admin bo‘limi |
| Cashback | Server balans, tasdiqlangan yetkazishda bonus, qaytarishda hisob-kitob |
| Karta/merchant to‘lovi | Hozir naqd; merchant integratsiyasi keyingi bosqich |
| Stories, sharh, VIP/yutuqlar, AI | Keyingi bosqich; bu PR’da yo‘q |

Eski mijozlar, Telegram IDlari, buyurtmalar, katalog rasmlari yoki boshqa jonli ma’lumotlar avtomatik ko‘chirilmagan. Ma’lumot ko‘chirish alohida zaxira va mapping bilan bajariladi.
