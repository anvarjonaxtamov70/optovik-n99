/** Validate persisted recovery metadata without coercing malformed local values. */
export function parsePendingOrder(raw: unknown): { id: string; raqam: number } | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const { id, raqam } = raw as Record<string, unknown>;
  if (typeof id !== 'string' || !/^[-A-Za-z0-9_]{20}$/.test(id) || typeof raqam !== 'number' || !Number.isInteger(raqam) || raqam < 100000 || raqam > 999999) return null;
  return { id, raqam };
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
