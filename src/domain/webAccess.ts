/**
 * Web (noutbuk) versiya faqat do'kon egasi uchun: brauzerda faqat `/admin…` va `/info/…`
 * (maxfiylik siyosati kabi ochiq sahifalar) ochiladi, qolgani `/admin` ga yo'naltiriladi.
 */
export function isWebAllowedPath(pathname: string): boolean {
  return /^\/(admin|info)(\/|$)/.test(pathname);
}
