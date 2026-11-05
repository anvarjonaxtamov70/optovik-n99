---
inclusion: always
---

# OPTOVIK N99 — loyiha qoidalari

## Bu nima
- Mustaqil iOS/Android ilova (Expo SDK 58, Expo Router, Reanimated 4). Telegram ishlatilmaydi.
- GM / Chevrolet ehtiyot qismlari va avtoaksessuarlar do‘koni, Samarqand. Logotip: `n99`. Uslub: Uzum Market tuzilishi, oq + to‘q ko‘k.
- Egasi dasturchi emas: o‘zgarishlar PR orqali, tushuntirishlar o‘zbek tilida, sodda.

## Arxitektura
- Firebase Realtime Database + Firebase Auth. Server kodi yo‘q (Spark tarifi). Xavfsizlik — `database.rules.json`.
- Mijoz — anonim Auth; admin — email/parol va `admins/{uid} = true`.
- Buyurtma: `src/domain/order.ts` → `buildOrderWrite` → bitta `update(ref(db), …)`: `orders/{uid}/{id}`, `orderIndex/{id}`, `customers/{uid}/lastOrderAt`. Qoidalar narxni katalog bilan, miqdorni qoldiq bilan, vaqtni `now` bilan solishtiradi.
- Qoldiq faqat admin tasdiqlaganda `increment()` bilan ayriladi (`adminSetStatus`), `zaxira` belgisi bilan.
- Yangi maydon qo‘shilsa: `src/domain/*` o‘quvchi + `database.rules.json` + `tests/rules.emulator.mjs`.
- Payme/Click qo‘shilganda — Cloudflare Worker (AvtoA1optum’dagi kabi), buyurtma summasi serverda tekshiriladi.

## Kod qoidalari
- Sof mantiq `src/domain/` da, `.ts` kengaytmali importlar bilan (Node testlari uchun), RN importsiz. Testlar: `tests/domain.test.mjs`.
- Matnlar `src/i18n/uz.ts` va `ru.ts` da, ikkalasiga birga (test tekshiradi).
- Ranglar, shriftlar, soyalar faqat `src/theme/tokens.ts` dan. Asosiy ko‘k `#2173B1`.
- Bosiladigan joylar `PressableScale` / `Button`; animatsiyalar Reanimated; JS-thread’dagi shared value o‘zgarishi `sv.set(...)`.
- Expo Go’da yo‘q native paket qo‘shilmaydi (aks holda development build kerakligini aytish shart). Paketlar `npx expo install` bilan.
- Tugatishdan oldin: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:rules`, `npx expo export --platform android`.
