export type Product = {
  id: string;
  kategoriya: string;
  nomi: string;
  narxi: number;
  qoldiq: number;
};

export type ShopState = {
  products: Product[];
  quantities: Record<string, number>;
  status: 'loading' | 'ready' | 'slow' | 'error';
  message: string;
  cartNotice: string;
};

export type ShopAction =
  | { type: 'products'; products: Product[]; message: string }
  | { type: 'quantity'; id: string; delta: 1 | -1 }
  | { type: 'remove'; id: string }
  | { type: 'loading' }
  | { type: 'slow' }
  | { type: 'error' }
  | { type: 'dismissNotice' };

export const initialShopState: ShopState = {
  products: [],
  quantities: {},
  status: 'loading',
  message: 'Mahsulotlar yuklanmoqda…',
  cartNotice: '',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

// Category/product paths stay unique even when IDs repeat across categories.
export function readProducts(value: unknown): Product[] {
  if (!isRecord(value)) return [];
  const products: Product[] = [];
  for (const [kategoriya, entries] of Object.entries(value)) {
    if (!isRecord(entries)) continue;
    for (const [id, p] of Object.entries(entries)) {
      if (
        !isRecord(p) ||
        typeof p.nomi !== 'string' || !p.nomi.trim() ||
        typeof p.narxi !== 'number' || !Number.isFinite(p.narxi) || p.narxi < 0 ||
        typeof p.qoldiq !== 'number' || !Number.isFinite(p.qoldiq)
      ) continue;
      products.push({
        id: `${kategoriya}/${id}`,
        kategoriya,
        nomi: p.nomi.trim(),
        narxi: p.narxi,
        qoldiq: Math.max(0, Math.floor(p.qoldiq)),
      });
    }
  }
  return products;
}

export function filterProducts(products: Product[], query: string, category: string | null) {
  const search = query.trim().toLowerCase();
  return products.filter((p) =>
    (category === null || p.kategoriya === category) && p.nomi.toLowerCase().includes(search)
  );
}

export function categoryLabel(category: string) {
  const label = category.replace(/[_-]+/g, ' ').trim();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatMoney(value: number) {
  return `${value.toLocaleString('ru-RU', { maximumFractionDigits: 2 })} so‘m`;
}

export function cartLines(state: ShopState) {
  return state.products.flatMap((product) => {
    const quantity = state.quantities[product.id] ?? 0;
    return quantity > 0 ? [{ ...product, quantity }] : [];
  });
}

export function cartSummary(state: ShopState) {
  return cartLines(state).reduce(
    (summary, item) => ({ count: summary.count + item.quantity, total: summary.total + item.narxi * item.quantity }),
    { count: 0, total: 0 }
  );
}

export function shopReducer(state: ShopState, action: ShopAction): ShopState {
  switch (action.type) {
    case 'products': {
      const available = new Map(action.products.map((p) => [p.id, p.qoldiq]));
      const quantities: Record<string, number> = {};
      let adjusted = false;
      for (const [id, quantity] of Object.entries(state.quantities)) {
        const next = Math.min(quantity, available.get(id) ?? 0);
        if (next > 0) quantities[id] = next;
        if (next !== quantity) adjusted = true;
      }
      return {
        ...state, products: action.products, quantities, status: 'ready', message: action.message,
        cartNotice: adjusted ? 'Qoldiq yangilandi. Savatdagi ayrim miqdorlar mavjud qoldiqqa moslashtirildi.' : state.cartNotice,
      };
    }
    case 'quantity': {
      const product = state.products.find((p) => p.id === action.id);
      if (!product || (action.delta > 0 && state.status !== 'ready')) return state;
      const current = state.quantities[action.id] ?? 0;
      const next = Math.max(0, Math.min(current + action.delta, product.qoldiq));
      if (next === current) return state;
      const quantities = { ...state.quantities };
      if (next === 0) delete quantities[action.id];
      else quantities[action.id] = next;
      return { ...state, quantities };
    }
    case 'remove': {
      const quantities = { ...state.quantities };
      delete quantities[action.id];
      return { ...state, quantities };
    }
    case 'loading': return { ...state, status: 'loading', message: 'Mahsulotlar yuklanmoqda…' };
    case 'slow': return { ...state, status: 'slow', message: 'Ulanish cho‘zilyapti. Internetni tekshiring va qayta urinib ko‘ring.' };
    case 'error': return { ...state, status: 'error', message: 'Mahsulotlarni yuklab bo‘lmadi. Internet va bazaga kirish ruxsatini tekshiring.' };
    case 'dismissNotice': return { ...state, cartNotice: '' };
  }
}
