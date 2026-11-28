import { MAX_LINES, MAX_QTY, validId } from './cart.ts';

type CatalogPrice = { narxi: number; qoldiq: number; archived?: boolean };
type DeliverySettings = { courierEnabled: boolean; pickupEnabled: boolean; courierFee: number; freeDeliveryFrom: number };

/** Catalog and settings must be loaded by the trusted service, not supplied by the customer. */
export function checkoutQuote(request: unknown, catalog: ReadonlyMap<string, CatalogPrice>, settings: DeliverySettings, kind: unknown) {
  if (!Array.isArray(request) || request.length < 1 || request.length > MAX_LINES) throw new Error('invalid-cart');
  if (kind !== 'olib' && kind !== 'kuryer') throw new Error('invalid-delivery');
  if (kind === 'olib' ? !settings.pickupEnabled : !settings.courierEnabled) throw new Error('delivery-disabled');
  if (![settings.courierFee, settings.freeDeliveryFrom].every(n => Number.isSafeInteger(n) && n >= 0)) throw new Error('invalid-settings');
  const seen = new Set<string>();
  let subtotal = 0, count = 0;
  const items: { id: string; qty: number; price: number }[] = [];
  for (const line of request) {
    if (!line || typeof line.id !== 'string' || !validId(line.id) || seen.has(line.id) || !Number.isSafeInteger(line.qty) || line.qty < 1 || line.qty > MAX_QTY) throw new Error('invalid-item');
    seen.add(line.id);
    const product = catalog.get(line.id);
    if (!product || product.archived || !Number.isSafeInteger(product.qoldiq) || product.qoldiq < line.qty) throw new Error('stock-unavailable');
    if (!Number.isSafeInteger(product.narxi) || product.narxi < 0) throw new Error('invalid-price');
    subtotal += product.narxi * line.qty;
    count += line.qty;
    items.push({ id: line.id, qty: line.qty, price: product.narxi });
  }
  const free = settings.freeDeliveryFrom > 0 && subtotal >= settings.freeDeliveryFrom;
  const delivery = kind === 'kuryer' && !free ? settings.courierFee : 0;
  const total = subtotal + delivery;
  if (!Number.isSafeInteger(total) || !Number.isSafeInteger(count) || subtotal > 1_000_000_000_000) throw new Error('total-out-of-range');
  return { items, subtotal, count, delivery, total };
}

/** Compare the displayed quote with fresh database values; never silently charge a new price. */
export function assertQuoteMatches(quote: ReturnType<typeof checkoutQuote>, displayed: { subtotal: number; count: number; delivery: number; total: number; lines: number }, prices: ReadonlyMap<string, number>) {
  if (quote.subtotal !== displayed.subtotal || quote.count !== displayed.count || quote.delivery !== displayed.delivery || quote.total !== displayed.total || quote.items.length !== displayed.lines || quote.items.some(item => prices.get(item.id) !== item.price)) throw new Error('quote-changed');
}

export function readQuoteProduct(raw: unknown): CatalogPrice {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('stock-unavailable');
  const p = raw as Record<string, unknown>;
  if ((p.archived !== undefined && typeof p.archived !== 'boolean') || typeof p.narxi !== 'number' || typeof p.qoldiq !== 'number' || !Number.isSafeInteger(p.narxi) || p.narxi < 0 || !Number.isSafeInteger(p.qoldiq) || p.qoldiq < 0) throw new Error('invalid-product');
  return { narxi: p.narxi, qoldiq: p.qoldiq, archived: p.archived === true };
}
