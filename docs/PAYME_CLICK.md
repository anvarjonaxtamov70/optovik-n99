# Payme va Click: ariza uchun tayyor ma’lumotlar

Bu sahifa Payme va Click’ga ariza topshirishda kerak bo‘ladigan hamma narsani bir joyga yig‘adi.
Ma’lumotlar guvohnoma, ustav va buxgalter javoblaridan olingan (2026-yil noyabr).

## 1. Korxona

| | |
| --- | --- |
| To‘liq nomi | «OPTAVIK N99» mas’uliyati cheklangan jamiyati |
| Qisqa nomi | «OPTAVIK N99» MChJ |
| STIR | 311 895 653 |
| Ro‘yxatdan o‘tgan | 06.02.2025, № 2718352 (Samarqand tumani DXM) |
| Faoliyat (IFUT/OKED) | 45320 — avtomobil detallari chakana savdosi |
| Yuridik manzil | Samarqand viloyati, Samarqand tumani, Yangiariq MFY, Hamal ko‘chasi, 16-uy |
| Do‘kon manzili | Yangi Samarqand zapchast bozori, 19-sektor, 2-do‘kon |
| Direktor (yagona ta’sischi, 100%) | Nosirov Azizbek Shokirovich |
| Ustav fondi | 5 000 000 so‘m — to‘liq shakllangan |
| Telefon | +998 90 250 35 09 |
| Email | *(Admin → Do‘kon sozlamalari → Email ga yozing)* |

**Ilova nomi (brend):** OPTOVIK N99. Rasmiy nom boshqacha yozilgani (OPTAVIK) normal — arizada «Brend / do‘kon nomi» maydoniga OPTOVIK N99, «Yuridik nom» maydoniga rasmiy nom yoziladi.

## 2. Bank

| | |
| --- | --- |
| Bank | AT «Xalq banki» Bosh amaliyotlar boshqarmasi (Toshkent sh.) |
| Hisob raqami | 20208000207198275001 |
| MFO | 01125 |

> Hisob raqami rekvizit varaqasidan (rasmdan) ko‘chirilgan. Arizaga yozishdan oldin bank ilovasi yoki bank hujjati bilan **harfma-harf** solishtiring.

## 3. Soliq va chek

| | |
| --- | --- |
| Soliq rejimi | aylanmadan olinadigan soliq — QQS to‘lovchisi emas |
| Chekdagi QQS | 0% |
| MXIK (IKPU) kodi | 08708001374000000 — yengil avtomobillar va yuk mashinalari uchun boshqa ehtiyot qismlar, detallar va butlovchi qismlar |
| Qadoq (o‘lchov birligi) kodi | 1417724 — dona |

Bu kodlar ilovada saqlanadi: **Admin → Do‘kon sozlamalari → Chek (soliq)**. Onlayn to‘lov ulanganda chekka shu yerdan yoziladi.

## 4. Havolalar (arizada so‘raladi)

| | |
| --- | --- |
| Ommaviy oferta (sotish shartlari) | https://optovikn99.web.app/info/oferta |
| Maxfiylik siyosati | https://optovikn99.web.app/info/privacy |
| Yetkazib berish va to‘lov | https://optovikn99.web.app/info/delivery |
| Ilova | iOS va Android (do‘konlarga chiqqandan keyin havolalar qo‘shiladi) |

Oferta matni ilovada ham bor: Kabinet → «Ommaviy oferta». Rekvizitlar sozlamalardan olinadi — sozlamalarda o‘zgartirsangiz, oferta ham o‘zgaradi.

## 5. Arizaga yuklanadigan hujjatlar (PDF yoki rasm)

1. Davlat ro‘yxatidan o‘tganlik guvohnomasi.
2. Ustav.
3. Direktorni tayinlash qarori — ta’sischining 06.02.2025 dagi 1-son qarori (bayonnomasi).
4. Direktor pasportining nusxasi.
5. Bank rekvizitlari ma’lumotnomasi.

ERI kaliti (elektron imzo) 21.02.2027 gacha amal qiladi — shartnoma elektron imzolansa, shu kalit ishlatiladi. **Muddat tugashidan oldin yangilang.**

## 6. Qayerga ariza beriladi

- **Payme Business** — business.payme.uz. Bizga **«billingli kassa»** kerak: to‘lovdan oldin bizning server buyurtma summasini tekshiradi. Texnik hujjat: https://developer.help.paycom.uz
- **Click** — merchant kabineti https://mc.click.uz, texnik hujjat: https://docs.click.uz (bizga **SHOP API**: Prepare va Complete so‘rovlari kerak).

Ariza ko‘rib chiqilishi bir necha kundan bir necha haftagacha davom etishi mumkin. Komissiya foizini shartnomada aniqlashtiring.

## 7. Ular nima beradi va uni nima qilish kerak

| Tizim | Beradi |
| --- | --- |
| Payme | `merchant_id` (kassa ID) va maxfiy kalit (avval sinov kaliti, keyin haqiqiy) |
| Click | `service_id`, `merchant_id`, `merchant_user_id` va maxfiy kalit |

**Muhim:** maxfiy kalitlarni chatga, Telegram’ga yoki menga matn qilib yubormang. Ular faqat GitHub → Settings → Secrets va Cloudflare’dagi maxfiy sozlamalarga kiritiladi. Kalit kelganda qanday kiritishni qadamma-qadam ko‘rsataman.

`merchant_id` va `service_id` maxfiy emas — ularni yozib yuborsangiz bo‘ladi.

## 8. Keyingi texnik qadam (men qilaman)

1. Bepul Cloudflare hisobi (siz ochasiz) — to‘lov tizimlaridan «pul tushdi» xabarini qabul qiladigan kichik server (Worker).
2. Server buyurtma summasini katalog bilan solishtiradi va buyurtmani «to‘landi» qiladi; chekka MXIK, qadoq kodi va QQS 0% yoziladi.
3. Ilovada Payme va Click «Tez kunda» o‘rniga haqiqiy tugma bo‘ladi; ofertadagi 4.2-band yangilanadi.
4. Sinov kalitlari bilan sinov to‘lovlari → haqiqiy kalitlarga o‘tish.
