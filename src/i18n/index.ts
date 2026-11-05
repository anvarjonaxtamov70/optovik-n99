import { useCallback } from 'react';

import { formatSom, type Lang } from '../domain/money';
import { useStore } from '../lib/store';
import { prefs, prefsStore } from '../state/prefs';
import { ru } from './ru';
import { uz, type Dict } from './uz';

export type TKey = keyof typeof uz;
export type TVars = Record<string, string | number>;
const dicts: Record<Lang, Dict> = { uz, ru };

function pluralRu(n: number, forms: string[]): string {
  const [one, few, many] = [forms[0], forms[1] ?? forms[0], forms[2] ?? forms[1] ?? forms[0]];
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

export function translate(lang: Lang, key: TKey, vars?: TVars): string {
  let s: string = dicts[lang][key] ?? uz[key] ?? key;
  if (s.includes('|')) {
    const n = Number(vars?.n ?? 0);
    s = lang === 'ru' ? pluralRu(n, s.split('|')) : s.split('|')[0];
  }
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k: string) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
  return s;
}

export function useLang(): Lang {
  return useStore(prefsStore, (s) => s.lang);
}

export function useT() {
  const lang = useLang();
  const t = useCallback((key: TKey, vars?: TVars) => translate(lang, key, vars), [lang]);
  const money = useCallback((v: number) => formatSom(v, lang), [lang]);
  return { t, lang, money, setLang: prefs.setLang };
}

/** Komponentdan tashqarida (masalan, toast) ishlatish uchun. */
export function tNow(key: TKey, vars?: TVars) {
  return translate(prefsStore.get().lang, key, vars);
}
