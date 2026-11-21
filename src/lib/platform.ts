import { Platform } from 'react-native';

export const IS_WEB = Platform.OS === 'web';

/**
 * Faqat lokal dizayn sinovi uchun: `EXPO_PUBLIC_WEB_SHOP_PREVIEW=1` bilan yig'ilgan web versiyada
 * do'kon sahifalari ham ochiladi. Joylanadigan saytda bu o'zgaruvchi yo'q — u faqat admin uchun.
 */
export const WEB_SHOP_PREVIEW = IS_WEB && process.env.EXPO_PUBLIC_WEB_SHOP_PREVIEW === '1';

/** Brauzerda faqat admin paneli ishlaydi (dizayn sinovidan tashqari). */
export const WEB_ADMIN_ONLY = IS_WEB && !WEB_SHOP_PREVIEW;
