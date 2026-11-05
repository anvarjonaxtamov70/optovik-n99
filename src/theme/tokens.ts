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
  saleSoft: '#FDECEC',
  success: '#17945A',
  successSoft: '#E6F6EE',
  warning: '#D9822B',
  warningSoft: '#FDF1E4',
  white: '#FFFFFF',
  black: '#000000',
  overlay: 'rgba(9, 25, 43, 0.45)',
} as const;

export const gradients = {
  brand: ['#3B8FD6', '#2173B1', '#164F84'] as const,
  button: ['#2B80C4', '#1D68A6'] as const,
  sky: ['#EAF5FF', '#D3E9FB'] as const,
  night: ['#16507F', '#0E355A'] as const,
  sunrise: ['#FF8A5B', '#E5383B'] as const,
  mint: ['#E8F8F0', '#CDEFDD'] as const,
  shimmer: ['rgba(255,255,255,0)', 'rgba(255,255,255,0.65)', 'rgba(255,255,255,0)'] as const,
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

export const shadow = StyleSheet.create({
  card: Platform.select({
    ios: { shadowColor: '#1B3E63', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 14 },
    default: { elevation: 2, shadowColor: '#1B3E63' },
  }) as object,
  soft: Platform.select({
    ios: { shadowColor: '#1B3E63', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
    default: { elevation: 1, shadowColor: '#1B3E63' },
  }) as object,
  float: Platform.select({
    ios: { shadowColor: '#0F2338', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 22 },
    default: { elevation: 10, shadowColor: '#0F2338' },
  }) as object,
  button: Platform.select({
    ios: { shadowColor: '#1D68A6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 12 },
    default: { elevation: 4, shadowColor: '#1D68A6' },
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

export const layout = { maxWidth: 760, gutter: 16 } as const;

/** StyleSheet.absoluteFillObject o'rniga (RN 0.88 da olib tashlangan). */
export const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;
