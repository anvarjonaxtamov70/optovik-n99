import { Platform, StyleSheet } from 'react-native';

/**
 * N99 dizayn tizimi.
 * Asosiy ko'k — Avto A1 Sky Glass `#2F8FD8` dan 20% to'qroq (`#2173B1`).
 */
export const colors = {
  primary: '#2173B1',
  primaryDark: '#185A8E',
  primaryDeep: '#0F3F69',
  primaryBright: '#3B8FD6',
  sky: '#8ED1FF',
  skyStrong: '#5DB2F0',
  tint: '#EAF3FB',
  tintStrong: '#D5E7F7',

  bg: '#F3F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F6F9FC',
  photo: '#EEF4FA',

  ink: '#0F2338',
  text: '#1C3148',
  muted: '#5D7186',
  faint: '#93A4B5',
  line: '#E2EAF2',
  lineStrong: '#CCD9E6',

  sale: '#E5383B',
  saleBright: '#EF5350',
  saleSoft: '#FDECEC',
  saleTint: '#FFF8F8',
  success: '#17945A',
  successSoft: '#E6F6EE',
  warning: '#D9822B',
  warningSoft: '#FDF1E4',
  /** "Tasdiqlandi" holati. */
  info: '#2D5BD8',
  infoSoft: '#E7F0FF',
  /** Yangi xabar nuqtasi, bayram belgilari. */
  gold: '#FFC94D',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(9, 25, 43, 0.45)',
  /** Qorong'i fon ustidagi matn va yorliqlar (rasm ustidagi "Tugagan", miqdor). */
  scrim: 'rgba(15, 35, 56, 0.78)',
  /** Rasmni to'liq ekranda ko'rish oynasining foni. */
  viewerBg: '#06101C',
  /** Toast: qorong'i fon va undagi ikonka ranglari. */
  toast: '#13283E',
  toastError: '#FF8A8A',
  toastSuccess: '#7EE2B0',
  /** Ko'k gradient ustidagi oq matn/shisha qatlamlari. */
  onBrandMuted: 'rgba(255, 255, 255, 0.82)',
  onBrandGlass: 'rgba(255, 255, 255, 0.14)',
} as const;

/** Rasmi yo'q tovar uchun yumshoq fon ohanglari. */
export const artTones: readonly (readonly [string, string])[] = [
  ['#EEF6FD', '#DCEBF8'], ['#F1F5FB', '#E1E9F4'], ['#EDF7F7', '#D9EDF0'], ['#F3F2FB', '#E3E2F4'],
];

export const gradients = {
  brand: ['#3B8FD6', '#2173B1', '#164F84'] as const,
  button: ['#2B80C4', '#1D68A6'] as const,
  sky: ['#EAF5FF', '#D3E9FB'] as const,
  night: ['#16507F', '#0E355A'] as const,
  sunrise: ['#FF8A5B', '#E5383B'] as const,
  mint: ['#E8F8F0', '#CDEFDD'] as const,
};

export const radius = { xs: 8, sm: 10, md: 14, lg: 18, xl: 24, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

export const fonts = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  heavy: 'Manrope_800ExtraBold',
  display: 'Unbounded_700Bold',
  displayHeavy: 'Unbounded_800ExtraBold',
} as const;

/**
 * Soyalar — past va yumshoq ("nozik"). Soya qaysi elementga berilsa, uning foni shaffof bo'lmasin:
 * shunda iOS soyani tez chizadi, Android esa to'g'ri shaklda chizadi.
 * - Android: `elevation` (eng arzon, apparat chizadi) + yarim shaffof rang — Android 9+ da soya rangi va kuchini shu beradi.
 * - Brauzer: `elevation` ishlamaydi, CSS `boxShadow`.
 * Soyalar animatsiya qilinmaydi (qimmat); bosilganda faqat `transform` o'zgaradi.
 */
export const shadow = StyleSheet.create({
  /** Chip va oq tugmalar: zo'rg'a sezilarli ko'tarilish. */
  xs: Platform.select({
    ios: { shadowColor: '#1B3E63', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 2 },
    web: { boxShadow: '0px 1px 2px rgba(27, 62, 99, 0.08)' },
    default: { elevation: 1, shadowColor: 'rgba(27, 62, 99, 0.45)' },
  }) as object,
  soft: Platform.select({
    ios: { shadowColor: '#1B3E63', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    web: { boxShadow: '0px 2px 6px rgba(27, 62, 99, 0.07)' },
    default: { elevation: 2, shadowColor: 'rgba(27, 62, 99, 0.4)' },
  }) as object,
  card: Platform.select({
    ios: { shadowColor: '#1B3E63', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14 },
    web: { boxShadow: '0px 6px 14px rgba(27, 62, 99, 0.08)' },
    default: { elevation: 3, shadowColor: 'rgba(27, 62, 99, 0.45)' },
  }) as object,
  float: Platform.select({
    ios: { shadowColor: '#0F2338', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.14, shadowRadius: 22 },
    web: { boxShadow: '0px 10px 22px rgba(15, 35, 56, 0.14)' },
    default: { elevation: 10, shadowColor: 'rgba(15, 35, 56, 0.55)' },
  }) as object,
  /** Ko'k tugma ostidagi rangli, yumshoq soya. */
  button: Platform.select({
    ios: { shadowColor: '#1D68A6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.24, shadowRadius: 8 },
    web: { boxShadow: '0px 4px 10px rgba(29, 104, 166, 0.26)' },
    default: { elevation: 3, shadowColor: 'rgba(29, 104, 166, 0.75)' },
  }) as object,
  /** Kichik ko'k tugmalar (kartadagi «Savatga», tanlangan chip). */
  buttonSm: Platform.select({
    ios: { shadowColor: '#1D68A6', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 5 },
    web: { boxShadow: '0px 2px 6px rgba(29, 104, 166, 0.22)' },
    default: { elevation: 2, shadowColor: 'rgba(29, 104, 166, 0.7)' },
  }) as object,
  danger: Platform.select({
    ios: { shadowColor: '#C62F32', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 8 },
    web: { boxShadow: '0px 4px 10px rgba(229, 56, 59, 0.24)' },
    default: { elevation: 3, shadowColor: 'rgba(229, 56, 59, 0.7)' },
  }) as object,
});

export const type = StyleSheet.create({
  hero: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.ink, letterSpacing: -0.6 },
  title: { fontFamily: fonts.heavy, fontSize: 22, lineHeight: 28, color: colors.ink, letterSpacing: -0.4 },
  h2: { fontFamily: fonts.heavy, fontSize: 19, lineHeight: 25, color: colors.ink, letterSpacing: -0.3 },
  h3: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 22, color: colors.ink },
  body: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, color: colors.text },
  bodyStrong: { fontFamily: fonts.bold, fontSize: 15, lineHeight: 22, color: colors.ink },
  small: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.muted },
  smallStrong: { fontFamily: fonts.bold, fontSize: 13, lineHeight: 18, color: colors.ink },
  tiny: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 15, color: colors.muted },
  price: { fontFamily: fonts.heavy, fontSize: 17, lineHeight: 22, color: colors.ink, fontVariant: ['tabular-nums'] },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, color: colors.muted, letterSpacing: 0.2 },
});

/** `wide` — noutbuk: admin bo'limi chap menyu va ikki ustun bilan ochiladi. */
export const layout = { maxWidth: 760, wideMaxWidth: 1240, gutter: 16, wide: 980 } as const;

/** StyleSheet.absoluteFillObject o'rniga (RN 0.88 da olib tashlangan). */
export const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
