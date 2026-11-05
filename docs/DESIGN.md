# OPTOVIK N99 — tasdiqlangan mijoz ekrani

2026-11-05 kuni kelishilgan dizayn. Keyingi o‘zgarishlarda ushbu qarorlar asos bo‘ladi.

## Yo‘nalish

Mustaqil iOS va Android magazin: GM / Chevrolet avtomobillari uchun ehtiyot qismlar va avtomobil aksessuarlari. Telegram ishlatilmaydi. Brend yozuvi — **OPTOVIK N99**.

## Mahsulot kartasi

- Avto_A1’dagi **App Store** kartasining rasm joylashuvi: 1:1, tepa va yon chetlarigacha, ichki oq ramkasiz. Faqat tashqi kartaning yuqori burchaklari yumaloq; rasmning pastki chegarasi tekis.
- **Bozor** kartasining boshqaruvi: to‘liq enli, savat belgili **Savatga** tugmasi. Sevimlilar va taqqoslash uchun kichik yumaloq tugmalar rasm ustida.
- Pastki qism: nom, mos model, mavjudlik, yangi narx, zarur bo‘lsa chizilgan eski narx va tugma.
- Aksiya: qizil **−N%** belgi. Foiz eski va joriy narxdan hisoblanadi. Eski narx joriy narxdan katta bo‘lmasa aksiya belgisi ko‘rsatilmaydi.
- Narx, qoldiq va rasm faqat haqiqiy katalogdan olinadi. Tasdiqlangan maketdagi 85 000 / 65 000 so‘m narxlar ishlab turgan katalogga yozilmaydi.
- Savat, sevimlilar va taqqoslash ilovaning umumiy holatidan foydalanadi. Miqdor qoldiqdan oshmaydi; ulanish bo‘lmasa qo‘shish o‘chiriladi.
- Oq va havorang, qora asosiy matn, mayin soya, burchak radiusi 20. Faqat qizil aksiya belgisida o‘qilishi uchun oq matn.

Manba: `anvarjonaxtamov70/Avto_A1`, `2377296b78df3719ed09d8dda3cb5d004c52598d`, `index.html` ichidagi `ac-card` va `bm-card`.

## Bosh ekran

Ixcham brend va Samarqand manzil tugmasi, qidiruv, GM va aksessuarlar uchun alohida banner, katalogdagi mavjud kategoriyalar, ishlaydigan filtr/saralash, mahsulotlar panjarasi. Qidiruvda bannerlar yashiriladi. Pastda Do‘kon, Sevimlilar, Savat, Profil.

Manzil: **Yangi Samarqand zapchast bozori, 19-sektor, 2-do‘kon.**

GM bo‘limi kategoriya, nom va mos model maydonlaridagi GM/Chevrolet modellari orqali saralanadi. Aksessuarlar bo‘limi kategoriya va aksessuar nomlari orqali saralanadi. Eski kategoriyadagi tasniflanmagan mahsulotlar **Barchasi**da saqlanadi. Masalan, yangi katalog yo‘llari `dvigatel/moy-filtri` va `aksessuarlar/telefon-tutqichi`; mos avtomobil maydoniga aniq model yoziladi.

Bannerlardagi mahalliy WebP rasmlar dekorativ, AI yordamida yaratilgan tasvirlar. Mahsulot rasmi sifatida ishlatilmaydi. Rasmlar uchun internet so‘rovi kerak emas. Barcha savdo matnlari native komponentlarda yoziladi.

## Holatlar va qulaylik

Yuklanish skeleti; natija topilmasa filtrni tozalash; qoldiq tugasa o‘chirilgan tugma; buzilgan yoki yo‘q rasm uchun ochiq placeholder; offline katalogni ko‘rish; qayta urinish; katta shriftda bitta ustun. Kichik belgili tugmalarning bosish maydoni 48×48. iOS pastki menyuda blur; Android’da yengil shaffof fon. Bosilganda tugmalarda ixcham vizual javob bor; avtomatik harakatlanuvchi banner yo‘q.

## Ishlash tartibi

Keyingi dizayn o‘zgarishlari PR orqali kiritiladi. Bosh ekran uchun mustaqil namuna mahsulotlar yoki lokal savat yaratilmaydi; `ShopProvider` va `ProductCard` ishlatiladi. Fayllarni qayta yozuvchi `make-design-pr.yml` va o‘chiruvchi `cleanup.yml` endi ishlatilmaydi.
