import { Fragment, useLayoutEffect, useState, type ReactNode } from 'react';

import { createStore, useStore } from '../../lib/store';

type Entry = { key: number; node: ReactNode };
const portalStore = createStore<Entry[]>([]);
let nextKey = 1;

/**
 * Ilova ildizida chiziladigan qatlamlar (pastdan chiqadigan oynalar) uchun joy.
 * Nega `Modal` emas: Android'da `Modal` alohida oyna — klaviatura hodisalari u yerga kelmaydi va
 * oyna ichidagi maydon klaviatura ostida qolib ketardi. Ildizdagi qatlamda klaviatura to'g'ri hisoblanadi.
 */
export function PortalHost() {
  const entries = useStore(portalStore, (s) => s);
  return <>{entries.map((e) => <Fragment key={e.key}>{e.node}</Fragment>)}</>;
}

/** `children` ni ekranning eng ustki qatlamida (PortalHost'da) chizadi. */
export function Portal({ children }: { children: ReactNode }) {
  const [k] = useState(() => nextKey++);
  useLayoutEffect(() => {
    portalStore.set((list) => (list.some((e) => e.key === k) ? list.map((e) => (e.key === k ? { key: k, node: children } : e)) : [...list, { key: k, node: children }]));
  }, [children, k]);
  useLayoutEffect(() => () => portalStore.set((list) => list.filter((e) => e.key !== k)), [k]);
  return null;
}
