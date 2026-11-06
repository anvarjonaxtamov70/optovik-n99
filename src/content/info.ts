import type { ShopSettings } from '../domain/content';
import { formatSom, type Lang } from '../domain/money';

export type InfoPage = 'about' | 'faq' | 'privacy' | 'delivery';
export type InfoSection = { title: string; text: string };

const fee = (s: ShopSettings, lang: Lang) => {
  const sum = (v: number) => formatSom(v, lang);
  if (!s.courierEnabled) return lang === 'ru' ? 'Доставка курьером сейчас не работает — доступен самовывоз.' : 'Kuryer orqali yetkazish hozircha ishlamayapti — do‘kondan olib ketish mumkin.';
  const base = s.courierFee > 0 ? (lang === 'ru' ? `Стоимость доставки — ${sum(s.courierFee)}.` : `Yetkazish narxi — ${sum(s.courierFee)}.`)
    : (lang === 'ru' ? 'Стоимость доставки оператор сообщит при подтверждении.' : 'Yetkazish narxini operator tasdiqlash vaqtida aytadi.');
  const free = s.freeDeliveryFrom > 0 ? (lang === 'ru' ? ` При заказе от ${sum(s.freeDeliveryFrom)} — бесплатно.` : ` ${sum(s.freeDeliveryFrom)} dan ortiq buyurtmada — bepul.`) : '';
  return base + free + (s.deliveryNote ? ` ${s.deliveryNote}` : '');
};

export function infoPage(page: InfoPage, lang: Lang, s: ShopSettings): InfoSection[] {
  const ru = lang === 'ru';
  const contact = s.phone ? s.phone : ru ? 'контакты в разделе «Связаться с нами»' : '«Biz bilan aloqa» bo‘limidagi raqamlar';
  const owner = s.legalName || s.name;
  switch (page) {
    case 'about':
      return ru ? [
        { title: s.name, text: `Магазин запчастей и аксессуаров для автомобилей GM / Chevrolet: Cobalt, Nexia, Gentra, Lacetti, Spark, Damas, Malibu, Tracker, Onix и других. Адрес: ${s.address}.` },
        { title: 'Как подобрать деталь', text: 'Выберите свой автомобиль в разделе «Мой автомобиль» — каталог покажет подходящие детали. Можно искать по названию, модели или артикулу (OEM-коду).' },
        { title: 'Наличие и цены', text: 'Цены и остатки в приложении обновляются в реальном времени из базы магазина. Перед отправкой заказ ещё раз проверяет актуальную цену и наличие.' },
      ] : [
        { title: s.name, text: `GM / Chevrolet avtomobillari uchun ehtiyot qismlar va aksessuarlar do‘koni: Cobalt, Nexia, Gentra, Lacetti, Spark, Damas, Malibu, Tracker, Onix va boshqalar. Manzil: ${s.address}.` },
        { title: 'Detalni qanday tanlash kerak', text: '«Mening mashinam» bo‘limida avtomobilingizni tanlang — katalog unga mos detallarni ko‘rsatadi. Nomi, modeli yoki artikuli (OEM kod) bo‘yicha qidirish mumkin.' },
        { title: 'Narx va qoldiq', text: 'Ilovadagi narx va qoldiq do‘kon bazasidan jonli yangilanadi. Buyurtma yuborilishidan oldin narx va mavjudlik yana bir bor tekshiriladi.' },
      ];
    case 'delivery':
      return ru ? [
        { title: 'Самовывоз', text: `Бесплатно из магазина: ${s.address}.${s.workHours ? ` Часы работы: ${s.workHours}.` : ''} Заберите заказ после того, как оператор подтвердит его готовность.` },
        { title: 'Доставка', text: fee(s, lang) },
        { title: 'Оплата', text: 'Сейчас доступна оплата наличными при получении. Онлайн-оплата через Payme, Click и Uzum Bank появится в ближайших обновлениях.' },
        { title: 'Подтверждение заказа', text: 'После оформления оператор звонит по указанному номеру, уточняет детали и подтверждает заказ. Статус заказа виден в разделе «Мои заказы».' },
      ] : [
        { title: 'Do‘kondan olib ketish', text: `Do‘kondan bepul: ${s.address}.${s.workHours ? ` Ish vaqti: ${s.workHours}.` : ''} Operator buyurtma tayyorligini tasdiqlagach olib ketishingiz mumkin.` },
        { title: 'Yetkazib berish', text: fee(s, lang) },
        { title: 'To‘lov', text: 'Hozircha tovarni qabul qilganda naqd to‘lanadi. Payme, Click va Uzum Bank orqali onlayn to‘lov keyingi yangilanishlarda qo‘shiladi.' },
        { title: 'Buyurtmani tasdiqlash', text: 'Rasmiylashtirgandan so‘ng operator ko‘rsatilgan raqamga qo‘ng‘iroq qilib, buyurtmani tasdiqlaydi. Holatini «Buyurtmalarim» bo‘limida kuzatasiz.' },
      ];
    case 'faq':
      return ru ? [
        { title: 'Как узнать, подойдёт ли деталь?', text: 'Выберите автомобиль в разделе «Мой автомобиль». На странице товара появится отметка о совместимости. Если сомневаетесь — укажите VIN или год выпуска в комментарии к заказу, оператор проверит.' },
        { title: 'Можно ли отменить заказ?', text: 'Да, пока заказ не подтверждён, его можно отменить в разделе «Мои заказы». После подтверждения — позвоните в магазин.' },
        { title: 'Нужна ли регистрация?', text: 'Нет. Заказ оформляется по имени и номеру телефона. История заказов хранится на этом устройстве.' },
        { title: 'Нет нужной детали?', text: `Свяжитесь с нами: ${contact}. Привезём под заказ.` },
      ] : [
        { title: 'Detal mashinamga mos kelishini qanday bilaman?', text: '«Mening mashinam» bo‘limida avtomobilingizni tanlang. Tovar sahifasida moslik belgisi chiqadi. Ikkilansangiz, izohga VIN yoki yilini yozing — operator tekshiradi.' },
        { title: 'Buyurtmani bekor qilsa bo‘ladimi?', text: 'Ha, tasdiqlanmagan buyurtmani «Buyurtmalarim» bo‘limida bekor qilasiz. Tasdiqlangandan keyin do‘konga qo‘ng‘iroq qiling.' },
        { title: 'Ro‘yxatdan o‘tish shartmi?', text: 'Yo‘q. Buyurtma ism va telefon raqam bilan beriladi. Buyurtmalar tarixi shu qurilmada saqlanadi.' },
        { title: 'Kerakli detal topilmadimi?', text: `Biz bilan bog‘laning: ${contact}. Buyurtma asosida olib kelib beramiz.` },
      ];
    case 'privacy':
      return ru ? [
        { title: 'Какие данные мы собираем', text: 'Имя, номер телефона, адрес доставки и комментарий к заказу, состав и история заказов, а также анонимный идентификатор устройства (Firebase). Избранное, корзина и выбранный автомобиль хранятся только на устройстве.' },
        { title: 'Зачем', text: 'Только для обработки и доставки заказов и связи с вами по заказу. Мы не продаём и не передаём данные третьим лицам для рекламы.' },
        { title: 'Где хранятся', text: 'В Google Firebase (Realtime Database, регион europe-west1) с правилами доступа: заказ видит только его владелец и сотрудники магазина.' },
        { title: 'Удаление данных', text: `Чтобы удалить ваши данные и историю заказов, свяжитесь с нами: ${contact}. Удаление приложения стирает локальные данные.` },
        { title: 'Ответственный', text: owner },
      ] : [
        { title: 'Qanday ma’lumot yig‘iladi', text: 'Ism, telefon raqam, yetkazish manzili va izoh, buyurtmalar tarkibi va tarixi hamda qurilmaning anonim identifikatori (Firebase). Saralangan, savat va tanlangan mashina faqat qurilmada saqlanadi.' },
        { title: 'Nima uchun', text: 'Faqat buyurtmani qabul qilish, yetkazish va siz bilan buyurtma bo‘yicha bog‘lanish uchun. Ma’lumotlar sotilmaydi va reklama uchun uchinchi shaxslarga berilmaydi.' },
        { title: 'Qayerda saqlanadi', text: 'Google Firebase (Realtime Database, europe-west1) da, kirish qoidalari bilan: buyurtmani faqat uning egasi va do‘kon xodimlari ko‘radi.' },
        { title: 'Ma’lumotni o‘chirish', text: `Ma’lumotlaringiz va buyurtmalar tarixini o‘chirish uchun biz bilan bog‘laning: ${contact}. Ilovani o‘chirsangiz, qurilmadagi ma’lumotlar ham o‘chadi.` },
        { title: 'Mas’ul', text: owner },
      ];
  }
}
