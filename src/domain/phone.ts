// O'zbekiston raqamlari: +998 va 9 ta raqam. Saqlash: "+998901234567".
const CODES = new Set(['20', '33', '50', '55', '61', '62', '65', '66', '67', '69', '70', '71', '72', '73', '74', '75', '76', '77', '78', '79', '88', '90', '91', '93', '94', '95', '97', '98', '99']);

/** Kiritilgan matndan +998 dan keyingi 9 ta raqamni oladi. */
export function localDigits(input: string): string {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('998') && d.length > 9) d = d.slice(3);
  return d.slice(0, 9);
}

/** "901234567" → "90 123 45 67" (yozish jarayonida ham ishlaydi). */
export function formatLocal(digits: string): string {
  const d = localDigits(digits);
  const parts = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return parts.join(' ');
}

export function isValidUzPhone(input: string): boolean {
  const d = localDigits(input);
  return d.length === 9 && CODES.has(d.slice(0, 2));
}

export function toE164(input: string): string {
  return '+998' + localDigits(input);
}

export function displayPhone(e164: string): string {
  const d = localDigits(e164);
  return d.length === 9 ? `+998 ${formatLocal(d)}` : e164;
}
