import { router } from 'expo-router';

import { openUrl } from './links';

export type ListParams = {
  title?: string; category?: string; group?: 'parts' | 'accessories'; model?: string; q?: string;
  sale?: '1'; new?: '1'; popular?: '1';
};

export function openList(params: ListParams) {
  router.push({ pathname: '/products', params });
}

export function openProduct(id: string) {
  const [category, pid] = id.split('/');
  router.push({ pathname: '/product/[category]/[id]', params: { category, id: pid } });
}

/** Banner va boshqa joylardagi havolalarni ochadi (domain/content.ts dagi turlar). */
export function openLink(link: string, title?: string) {
  if (link === 'sale') return openList({ sale: '1', title });
  if (link === 'new') return openList({ new: '1', title });
  if (link === 'popular') return openList({ popular: '1', title });
  if (link === 'catalog') return router.navigate('/catalog');
  if (link === 'contact') return router.push('/contact');
  if (link === 'delivery') return router.push({ pathname: '/info/[page]', params: { page: 'delivery' } });
  const [kind, ...rest] = link.split(':');
  const value = rest.join(':');
  if (kind === 'group' && (value === 'parts' || value === 'accessories')) return openList({ group: value, title });
  if (kind === 'cat') return openList({ category: value, title });
  if (kind === 'model') return openList({ model: value, title });
  if (kind === 'search') return router.push({ pathname: '/search', params: { q: value } });
  if (kind === 'product') return openProduct(value);
  if (kind === 'https') return openUrl(link);
}
