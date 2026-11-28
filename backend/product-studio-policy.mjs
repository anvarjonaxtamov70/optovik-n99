// Pure policy: no network, persistence, paid calls or product mutations.
export const STUDIO_LIMITS = Object.freeze({maxBytes: 10 * 1024 * 1024, maxPixels: 20_000_000, maxSide: 8192});
const mimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const templates = new Set(['premium', 'classic', 'cinematic']);
const controls = /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u;
function clean(value, limit) {
  if (typeof value !== 'string' || controls.test(value)) return '';
  const text = value.trim();
  return text.length <= limit ? text : '';
}
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
// Metadata must come from trusted byte inspection/decoder, not a client MIME claim.
export function validateStudioImage(meta) {
  if (!record(meta) || !mimeTypes.has(meta.mime)) return 'invalid-image-type';
  if (!Number.isSafeInteger(meta.bytes) || meta.bytes < 1 || meta.bytes > STUDIO_LIMITS.maxBytes) return 'invalid-image-size';
  const {width, height} = meta;
  if (![width, height].every(n => Number.isSafeInteger(n) && n > 0 && n <= STUDIO_LIMITS.maxSide) || width * height > STUDIO_LIMITS.maxPixels) return 'invalid-image-dimensions';
  return null;
}
// AI suggestions are untrusted draft text; do not spread raw fields into a product.
export function normalizeStudioDraft(raw) {
  const data = record(raw) ? raw : {};
  return {
    nomi: clean(data.nomi, 160),
    brend: clean(data.brend, 60),
    artikul: clean(data.artikul, 80),
    modelSuggestion: clean(data.modelSuggestion, 300),
    tavsifUz: clean(data.tavsifUz, 1000),
    tavsifRu: clean(data.tavsifRu, 1000),
    requiresReview: true,
  };
}
// Artwork uses only explicit admin-reviewed text, never raw AI fitment.
// The caller must enforce admin authentication and explicit review in later phases.
export function studioArtworkText(reviewed) {
  if (!record(reviewed)) return null;
  const nomi = clean(reviewed.nomi, 160);
  if (!nomi || !templates.has(reviewed.template)) return null;
  const model = reviewed.fitmentConfirmed === true ? clean(reviewed.model, 300) : '';
  return {nomi, model, template: reviewed.template};
}
