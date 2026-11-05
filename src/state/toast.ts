import { createStore, useStore } from '../lib/store';

export type Toast = {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
  action?: { label: string; onPress: () => void };
  icon?: string;
};

export const toastStore = createStore<Toast | null>(null);
let seq = 0;
let timer: ReturnType<typeof setTimeout> | null = null;

export function showToast(message: string, opts: Partial<Omit<Toast, 'id' | 'message'>> & { duration?: number } = {}) {
  if (timer) clearTimeout(timer);
  const id = ++seq;
  toastStore.set({ id, message, kind: opts.kind ?? 'info', action: opts.action, icon: opts.icon });
  timer = setTimeout(() => { if (toastStore.get()?.id === id) toastStore.set(null); }, opts.duration ?? (opts.action ? 4000 : 2400));
}

export function hideToast() {
  toastStore.set(null);
}

export const useToast = () => useStore(toastStore, (s) => s);
