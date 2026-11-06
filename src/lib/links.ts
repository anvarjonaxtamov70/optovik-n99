import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

import type { ShopSettings } from '../domain/content';

async function open(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert('', url);
  }
}

export function callPhone(phone: string) {
  const clean = phone.replace(/[^\d+]/g, '');
  if (clean) void open(`tel:${clean}`);
}

export function openTelegram(username: string) {
  const u = username.replace(/^@/, '').replace(/^https?:\/\/t\.me\//, '').trim();
  if (u) void open(`https://t.me/${encodeURIComponent(u)}`);
}

export function openInstagram(username: string) {
  const u = username.replace(/^@/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/\/$/, '').trim();
  if (u) void open(`https://instagram.com/${encodeURIComponent(u)}`);
}

export function openMap(s: Pick<ShopSettings, 'lat' | 'lng' | 'address'>, provider: 'yandex' | 'google' = 'yandex') {
  if (s.lat != null && s.lng != null) {
    void open(provider === 'yandex'
      ? `https://yandex.uz/maps/?pt=${s.lng},${s.lat}&z=17&l=map&rtext=~${s.lat},${s.lng}`
      : `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`);
    return;
  }
  const q = encodeURIComponent(s.address);
  void open(provider === 'yandex' ? `https://yandex.uz/maps/?text=${q}` : `https://www.google.com/maps/search/?api=1&query=${q}`);
}

export function openUrl(url: string) {
  if (/^https:\/\//.test(url)) void open(url);
}
