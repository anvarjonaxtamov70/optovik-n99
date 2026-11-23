/** Xarita nuqtasi (WGS-84). */
export type LatLng = { lat: number; lng: number };

/** Samarqand markazi — do'kon koordinatasi kiritilmagan bo'lsa xarita shu yerdan ochiladi. */
export const SAMARQAND: LatLng = { lat: 39.6542, lng: 66.9597 };

export function isValidLatLng(p: unknown): p is LatLng {
  if (!p || typeof p !== 'object') return false;
  const { lat, lng } = p as Record<string, unknown>;
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 && !(lat === 0 && lng === 0);
}

/** 6 xona (~10 sm) — kuryer uchun yetarli, bazada ortiqcha raqam saqlanmaydi. */
export function roundCoord(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

/** Ikki nuqta orasidagi masofa, km (havo yo'li bo'yicha). */
export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "0,8 km" / "12 km" — o'zbek va rus tilida o'nlik vergul bilan. */
export function formatKm(km: number): string {
  if (km < 10) return `${(Math.round(km * 10) / 10).toFixed(1).replace('.', ',')} km`;
  return `${Math.round(km)} km`;
}

export type GeocodedParts = {
  street?: string | null; streetNumber?: string | null; name?: string | null;
  district?: string | null; city?: string | null; subregion?: string | null; region?: string | null;
};

/**
 * Telefon geokoderi qaytargan qismlardan qisqa manzil: "Registon ko‘chasi, 12, Samarqand".
 * Takrorlar tashlanadi (ba'zi telefonlarda `name` ko'cha nomining o'zi bo'ladi).
 */
export function composeAddress(a: GeocodedParts): string {
  const clean = (v?: string | null) => (typeof v === 'string' ? v.trim() : '');
  const street = clean(a.street);
  const num = clean(a.streetNumber);
  const name = clean(a.name);
  const city = clean(a.city) || clean(a.subregion) || clean(a.region);
  const parts: string[] = [];
  if (street) parts.push(num && !street.includes(num) ? `${street}, ${num}` : street);
  else if (name && !/^\d+$/.test(name)) parts.push(num && !name.includes(num) ? `${name}, ${num}` : name);
  else if (name) parts.push(name);
  const district = clean(a.district);
  if (district && !parts.some((p) => p.includes(district)) && district !== city) parts.push(district);
  if (city && !parts.some((p) => p.includes(city))) parts.push(city);
  return parts.join(', ').slice(0, 200);
}

/** Kuryer va admin uchun xarita havolalari: Yandex (O'zbekistonda eng ko'p ishlatiladi) va Google. */
export function mapUrl(p: LatLng, provider: 'yandex' | 'google' = 'yandex'): string {
  const lat = roundCoord(p.lat);
  const lng = roundCoord(p.lng);
  return provider === 'yandex'
    ? `https://yandex.uz/maps/?pt=${lng},${lat}&z=17&l=map`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
