/** Validate persisted recovery metadata without coercing malformed local values. */
export type PendingOrder = { id: string; raqam: number; intent?: string };

export function parsePendingOrder(raw: unknown): PendingOrder | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const { id, raqam, intent } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || !/^[-A-Za-z0-9_]{20}$/.test(id) || typeof raqam !== 'number' || !Number.isInteger(raqam) || raqam < 100000 || raqam > 999999) return null;
  // Legacy or damaged intent metadata is still usable for read-only reconciliation.
  return { id, raqam, ...(typeof intent === 'string' && intent.length > 0 && intent.length <= 32768 ? { intent } : {}) };
}

/** Read-only server reconciliation. Never create a replacement order during automatic recovery. */
export async function recoverConfirmedPending<T extends { raqam: number }>(options: {
  active: () => boolean;
  load: () => Promise<unknown>;
  read: (id: string) => Promise<T | null>;
  apply: (order: T) => Promise<void>;
}): Promise<'idle' | 'unresolved' | 'applied' | 'inactive'> {
  if (!options.active()) return 'inactive';
  const raw = await options.load();
  if (!options.active()) return 'inactive';
  if (raw === null) return 'idle';
  const pending = parsePendingOrder(raw);
  if (!pending) return 'unresolved';
  const order = await options.read(pending.id);
  if (!options.active()) return 'inactive';
  if (!order || order.raqam !== pending.raqam) return 'unresolved';
  await options.apply(order);
  return 'applied';
}

/** Stable serialization of the original JSON order; no hash collisions or object-key-order dependence.
 * The snapshot stays in session memory for new attempts, not a log or server field.
 */
export function checkoutIntent(value: unknown): string {
  function canonical(v: unknown): unknown {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (Array.isArray(v)) return v.map(canonical);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([k, val]) => [k, canonical(val)]));
    throw new Error('Invalid checkout intent');
  }
  const result = JSON.stringify(canonical(value));
  if (result.length > 32768) throw new Error('Checkout intent too large');
  return result;
}

/** A missing server order does not establish that a previous write failed. */
export function canRetryPending(pending: PendingOrder | null, intent: string): boolean {
  return pending === null || (typeof pending.intent === 'string' && pending.intent === intent);
}
