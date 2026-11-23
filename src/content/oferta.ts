import type { ShopSettings } from '../domain/content.ts';
import type { Lang } from '../domain/money.ts';
import { displayPhone } from '../domain/phone.ts';

export type OfertaSection = { title: string; text: string };

/** Oferta tahriri sanasi: matn o'zgarsa, shu sana ham yangilanadi (yangi tahrir shu kundan kuchga kiradi). */
export const OFERTA_DATE = '2026-11-23';

/** Tovarni (o'rnatilmagan/ishlatilmagan) qaytarish muddati, kun. */
export const RETURN_DAYS = 10;

function formatDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-');
  return lang === 'ru' ? `${d}.${m}.${y}` : `${d}.${m}.${y}-yil`;
}

/**
 * Ommaviy oferta — onlayn oldi-sotdi shartnomasi (o'zbek va rus tilida).
 * Sotuvchi rekvizitlari do'kon sozlamalaridan olinadi, shuning uchun ular o'zgarsa matnni qayta yozish shart emas.
 * Bo'sh rekvizit (masalan, email) matnda ko'rsatilmaydi.
 */
export function ofertaSections(lang: Lang, s: ShopSettings): OfertaSection[] {
  const ru = lang === 'ru';
  const seller = s.legalName || s.name;
  const brand = s.name;
  const date = formatDate(OFERTA_DATE, lang);
  const phone = s.phone ? displayPhone(s.phone) : '';
  const contact = [phone, s.email].filter(Boolean).join(', ');
  const hours = s.workHours ? (ru ? ` Часы работы: ${s.workHours}.` : ` Ish vaqti: ${s.workHours}.`) : '';
  const line = (label: string, value: string) => (value ? `${label}: ${value}` : '');
  const requisites = (ru ? [
    seller,
    line('ИНН', s.inn),
    line('Юридический адрес', s.legalAddress),
    line('Адрес магазина', s.address),
    line('Банк', s.bankName),
    line('Расчётный счёт', s.bankAccount),
    line('МФО', s.bankMfo),
    line('Директор', s.director),
    line('Телефон', phone),
    line('Эл. почта', s.email),
  ] : [
    seller,
    line('STIR', s.inn),
    line('Yuridik manzil', s.legalAddress),
    line('Do‘kon manzili', s.address),
    line('Bank', s.bankName),
    line('Hisob raqami', s.bankAccount),
    line('MFO', s.bankMfo),
    line('Direktor', s.director),
    line('Telefon', phone),
    line('Email', s.email),
  ]).filter(Boolean).join('\n');

  if (ru) {
    return [
      {
        title: '1. Общие положения',
        text: [
          `Редакция от ${date}.`,
          `1.1. Настоящий документ — публичная оферта ${seller} (далее — «Продавец») о продаже товаров через мобильное приложение и сайт «${brand}».`,
          '1.2. Покупатель, оформляя заказ в приложении и нажимая кнопку «Оформить заказ», полностью и безоговорочно принимает условия оферты (акцепт). С этого момента договор купли-продажи между Покупателем и Продавцом считается заключённым.',
          '1.3. Отношения сторон регулируются Гражданским кодексом Республики Узбекистан, законами «О защите прав потребителей» и «Об электронной коммерции».',
          '1.4. Продавец вправе изменять оферту. Новая редакция вступает в силу со дня публикации в приложении и применяется к заказам, оформленным после этого дня.',
        ].join('\n'),
      },
      {
        title: '2. Товар и цена',
        text: [
          '2.1. Название, цена, фото, совместимые автомобили и наличие товара указаны на странице товара. Фото может отличаться от внешнего вида товара.',
          '2.2. Цены указаны в сумах. Цена принятого заказа не меняется.',
          '2.3. Чтобы проверить совместимость детали, Покупатель может указать год выпуска или VIN-код автомобиля в комментарии к заказу.',
        ].join('\n'),
      },
      {
        title: '3. Оформление заказа',
        text: [
          '3.1. Покупатель выбирает товар, указывает имя, номер телефона и способ получения.',
          '3.2. После оформления оператор Продавца звонит Покупателю и подтверждает заказ. Если товара нет в наличии, оператор сообщает об этом, и заказ может быть изменён или отменён.',
          '3.3. Неподтверждённый заказ Покупатель может отменить в разделе «Мои заказы». Чтобы отменить подтверждённый заказ, нужно позвонить Продавцу.',
        ].join('\n'),
      },
      {
        title: '4. Оплата',
        text: [
          '4.1. Оплата производится наличными при получении товара — курьеру или в магазине.',
          '4.2. Онлайн-способы оплаты (Payme, Click) появятся в приложении после их подключения.',
          '4.3. Продавец выдаёт чек в соответствии с законодательством.',
        ].join('\n'),
      },
      {
        title: '5. Доставка и самовывоз',
        text: [
          `5.1. Самовывоз из магазина — бесплатно: ${s.address}.${hours}`,
          '5.2. Курьерская доставка — по Самарканду. Стоимость и срок доставки указываются при оформлении заказа или сообщаются оператором.',
          '5.3. При получении Покупатель проверяет количество, внешний вид и целостность товара. О видимых повреждениях нужно сообщить в момент получения.',
        ].join('\n'),
      },
      {
        title: '6. Возврат и обмен',
        text: [
          `6.1. Товар надлежащего качества можно вернуть или обменять в течение ${RETURN_DAYS} дней со дня получения, если он не использовался, сохранены его товарный вид, упаковка и ярлыки. Деталь, которую только примерили, но не эксплуатировали, тоже можно вернуть.`,
          '6.2. Деталь, которая была установлена на автомобиль и эксплуатировалась, возврату не подлежит.',
          '6.3. Товар с недостатком (заводской брак, не работает) обменивается или возвращаются деньги в соответствии с законодательством. Для этого Покупатель обращается к Продавцу и передаёт товар вместе с чеком или номером заказа.',
          '6.4. Деньги возвращаются, как правило, тем же способом, которым была произведена оплата.',
        ].join('\n'),
      },
      {
        title: '7. Гарантия',
        text: [
          '7.1. Гарантийный срок зависит от товара и указывается в описании товара или сообщается при продаже. Если срок не указан, применяется порядок, установленный законодательством.',
          '7.2. Гарантия не распространяется на повреждения из-за неправильной установки, ДТП или неправильной эксплуатации.',
        ].join('\n'),
      },
      {
        title: '8. Ответственность сторон',
        text: [
          '8.1. Продавец не отвечает за задержку доставки, если Покупатель указал неверный номер телефона или адрес.',
          '8.2. Стороны освобождаются от ответственности за неисполнение обязательств из-за обстоятельств непреодолимой силы (стихийные бедствия, перебои связи и т. п.).',
        ].join('\n'),
      },
      {
        title: '9. Персональные данные',
        text: 'Оформляя заказ, Покупатель соглашается на использование своего имени, номера телефона и адреса для выполнения заказа. Подробнее — в «Политике конфиденциальности» в приложении.',
      },
      {
        title: '10. Разрешение споров',
        text: `Споры решаются путём переговоров${contact ? ` (связь с Продавцом: ${contact})` : ''}. Если договориться не удалось, спор рассматривается в суде в соответствии с законодательством Республики Узбекистан.`,
      },
      { title: '11. Реквизиты Продавца', text: requisites },
    ];
  }

  return [
    {
      title: '1. Umumiy qoidalar',
      text: [
        `${date} tahriri.`,
        `1.1. Ushbu hujjat ${seller} (keyingi o‘rinlarda — «Sotuvchi») ning «${brand}» mobil ilovasi va sayti orqali tovar sotish bo‘yicha ommaviy ofertasidir.`,
        '1.2. Xaridor ilovada buyurtmani rasmiylashtirib, «Buyurtma berish» tugmasini bosgan paytdan boshlab oferta shartlarini to‘liq qabul qilgan hisoblanadi (aksept). Shu paytdan Xaridor va Sotuvchi o‘rtasida oldi-sotdi shartnomasi tuzilgan bo‘ladi.',
        '1.3. Tomonlar munosabatlari O‘zbekiston Respublikasining Fuqarolik kodeksi, «Iste’molchilarning huquqlarini himoya qilish to‘g‘risida»gi va «Elektron tijorat to‘g‘risida»gi qonunlari bilan tartibga solinadi.',
        '1.4. Sotuvchi ofertani o‘zgartirishi mumkin. Yangi tahrir ilovada e’lon qilingan kundan kuchga kiradi va shu kundan keyin berilgan buyurtmalarga qo‘llanadi.',
      ].join('\n'),
    },
    {
      title: '2. Tovar va narx',
      text: [
        '2.1. Tovar nomi, narxi, rasmi, mos mashinalar va mavjudligi tovar sahifasida ko‘rsatiladi. Rasm tovarning tashqi ko‘rinishidan farq qilishi mumkin.',
        '2.2. Narxlar so‘mda ko‘rsatiladi. Qabul qilingan buyurtmaning narxi o‘zgarmaydi.',
        '2.3. Detal mashinaga mos kelishini tekshirish uchun Xaridor buyurtma izohiga mashina yili yoki VIN-kodini yozishi mumkin.',
      ].join('\n'),
    },
    {
      title: '3. Buyurtma berish',
      text: [
        '3.1. Xaridor tovarni tanlaydi, ismi, telefon raqami va qabul qilish usulini ko‘rsatadi.',
        '3.2. Rasmiylashtirilgandan so‘ng Sotuvchi operatori Xaridorga qo‘ng‘iroq qilib, buyurtmani tasdiqlaydi. Tovar tugab qolgan bo‘lsa, operator bu haqda aytadi va buyurtma o‘zgartirilishi yoki bekor qilinishi mumkin.',
        '3.3. Tasdiqlanmagan buyurtmani Xaridor «Buyurtmalarim» bo‘limida bekor qila oladi. Tasdiqlangan buyurtmani bekor qilish uchun Sotuvchiga qo‘ng‘iroq qilinadi.',
      ].join('\n'),
    },
    {
      title: '4. To‘lov',
      text: [
        '4.1. To‘lov tovarni qabul qilishda naqd pulda amalga oshiriladi — kuryerga yoki do‘konda.',
        '4.2. Onlayn to‘lov usullari (Payme, Click) ulangandan keyin ilovada paydo bo‘ladi.',
        '4.3. Sotuvchi qonunchilikka muvofiq chek beradi.',
      ].join('\n'),
    },
    {
      title: '5. Yetkazib berish va olib ketish',
      text: [
        `5.1. Do‘kondan olib ketish — bepul: ${s.address}.${hours}`,
        '5.2. Kuryer orqali yetkazish — Samarqand bo‘ylab. Yetkazish narxi va muddati buyurtma rasmiylashtirilayotganda ko‘rsatiladi yoki operator tomonidan aytiladi.',
        '5.3. Xaridor tovarni qabul qilayotganda uning soni, ko‘rinishi va butligini tekshiradi. Ko‘rinib turgan shikast haqida qabul qilish paytida aytish kerak.',
      ].join('\n'),
    },
    {
      title: '6. Qaytarish va almashtirish',
      text: [
        `6.1. Sifatli tovarni olingan kundan boshlab ${RETURN_DAYS} kun ichida qaytarish yoki almashtirish mumkin: tovar ishlatilmagan, ko‘rinishi, qadog‘i va yorliqlari saqlangan bo‘lishi kerak. Faqat o‘rnatib ko‘rilgan, lekin ishlatilmagan detal ham qaytariladi.`,
        '6.2. Mashinaga o‘rnatilib, ishlatilgan detal qaytarib olinmaydi.',
        '6.3. Nuqsonli tovar (zavod nuqsoni, ishlamaydi) qonunchilikka muvofiq almashtiriladi yoki puli qaytariladi. Buning uchun Xaridor Sotuvchiga murojaat qiladi va tovarni chek yoki buyurtma raqami bilan topshiradi.',
        '6.4. Pul, odatda, to‘lov qanday usulda qilingan bo‘lsa, shu usulda qaytariladi.',
      ].join('\n'),
    },
    {
      title: '7. Kafolat',
      text: [
        '7.1. Kafolat muddati tovarga qarab har xil bo‘ladi va tovar tavsifida yoziladi yoki sotishda aytiladi. Muddat ko‘rsatilmagan bo‘lsa, qonunchilikda belgilangan tartib qo‘llanadi.',
        '7.2. Noto‘g‘ri o‘rnatish, avariya yoki noto‘g‘ri foydalanish natijasidagi shikastlar kafolatga kirmaydi.',
      ].join('\n'),
    },
    {
      title: '8. Tomonlarning javobgarligi',
      text: [
        '8.1. Xaridor noto‘g‘ri telefon raqam yoki manzil ko‘rsatgan bo‘lsa, yetkazishdagi kechikish uchun Sotuvchi javob bermaydi.',
        '8.2. Yengib bo‘lmaydigan kuch holatlarida (tabiiy ofat, aloqa uzilishi va h.k.) tomonlar majburiyatni bajarmagani uchun javob bermaydi.',
      ].join('\n'),
    },
    {
      title: '9. Shaxsiy ma’lumotlar',
      text: 'Buyurtma berish orqali Xaridor ismi, telefon raqami va manzili buyurtmani bajarish uchun ishlatilishiga rozilik beradi. Batafsil — ilovadagi «Maxfiylik siyosati»da.',
    },
    {
      title: '10. Nizolarni hal qilish',
      text: `Nizolar muzokara yo‘li bilan hal qilinadi${contact ? ` (Sotuvchi bilan aloqa: ${contact})` : ''}. Kelishuvga erishilmasa, nizo O‘zbekiston Respublikasi qonunchiligiga muvofiq sudda ko‘rib chiqiladi.`,
    },
    { title: '11. Sotuvchi rekvizitlari', text: requisites },
  ];
}
