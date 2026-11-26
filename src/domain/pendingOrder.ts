/** Validate persisted recovery metadata without coercing malformed local values. */
export function parsePendingOrder(raw: unknown): { id: string; raqam: number } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const { id, raqam } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || !/^[-A-Za-z0-9_]{20}$/.test(id) || typeof raqam !== 'number' || !Number.isInteger(raqam) || raqam < 100000 || raqam > 999999) return null;
  return { id, raqam };
}
