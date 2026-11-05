export type Lang = 'uz' | 'ru';

const NBSP = '\u00A0';

/** 1250000 → "1 250 000". Hermes'dagi Intl farqlariga bog'lanmaslik uchun qo'lda. */
export function groupDigits(value: number): string {
  const n = Math.round(Math.abs(value));
  const s = String(n);
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += NBSP;
    out += s[i];
  }
  return (value < 0 ? '−' : '') + out;
}

export function currency(lang: Lang): string {
  return lang === 'ru' ? 'сум' : 'so‘m';
}

export function formatSom(value: number, lang: Lang = 'uz'): string {
  return `${groupDigits(value)}${NBSP}${currency(lang)}`;
}

export function isMoney(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000_000;
}
