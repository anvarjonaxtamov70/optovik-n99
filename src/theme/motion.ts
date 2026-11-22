import { Easing } from 'react-native-reanimated';

/**
 * Harakat qoidalari: animatsiyalar qisqa va sokin, takrorlanib "likillaydigan" tinimsiz animatsiya yo'q.
 * Hammasi Reanimated orqali UI-oqimda ishlaydi va telefonda «Harakatni kamaytirish» yoqilsa o'chadi.
 */
export const spring = {
  snappy: { damping: 18, stiffness: 320, mass: 0.7 },
  /** Yumshoq qaytish: ozgina "tirik" sakraydi, lekin chayqalib turmaydi. */
  bouncy: { damping: 15, stiffness: 300, mass: 0.7 },
  soft: { damping: 20, stiffness: 160, mass: 0.9 },
} as const;

/** Bosilish: barmoq tekkanda tez botadi, qo'yib yuborilganda prujinadek yumshoq qaytadi. */
export const press = {
  in: { duration: 80, easing: Easing.out(Easing.quad) },
  out: { damping: 14, stiffness: 340, mass: 0.6 },
  /**
   * Bosilish effekti boshlanishidan oldingi kutish (ms). Ro'yxatni aylantirish uchun tekkan barmoq
   * kartani "silkitmasligi" uchun — Android va iOS o'zlari ham shunday qiladi. Tez bosish baribir ko'rinadi.
   */
  delay: 70,
  hover: { duration: 140 },
} as const;

export const ease = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
};
