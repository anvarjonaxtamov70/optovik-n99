// Qidiruv uchun matnni bir xil ko'rinishga keltirish: kichik harf, apostroflarsiz,
// kirill → lotin, "c" → "k" (Cobalt = Кобальт), artikul ichidagi bo'shliq va chiziqlarsiz.
const CYR: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'j', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 's', ч: 'ch', ш: 'sh', щ: 'sh',
  ъ: '', ы: 'i', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};

export function fold(value: string): string {
  let out = '';
  for (const ch of value.toLowerCase()) out += CYR[ch] ?? ch;
  return out
    .replace(/[‘’ʻʼ`'´]/g, '')
    .replace(/c(?!h)/g, 'k')
    .replace(/x/g, 'h')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Artikul/OEM kodlarini solishtirish uchun: faqat harf va raqam. */
export function compactCode(value: string): string {
  return fold(value).replace(/[^a-z0-9]/g, '');
}

export function tokens(query: string): string[] {
  return fold(query).split(/[\s,.;/]+/).filter(Boolean).slice(0, 8);
}

export function capitalize(value: string): string {
  const v = value.trim();
  return v ? v.charAt(0).toUpperCase() + v.slice(1) : v;
}
