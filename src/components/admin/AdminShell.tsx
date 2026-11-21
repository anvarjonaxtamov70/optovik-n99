import { router, usePathname, type Href } from 'expo-router';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { useT, type TKey } from '../../i18n';
import { adminSignOut, useAccount } from '../../state/account';
import { useAdminOrders } from '../../state/orders';
import { colors, layout, radius } from '../../theme/tokens';
import { LogoMark } from '../brand/Logo';
import { Icon, type IconName } from '../ui/Icon';
import { Txt } from '../ui/Txt';

/** Kompyuterda admin bo'limi chap menyu bilan ochiladi; shu kenglikdan boshlab. */
export const ADMIN_WIDE = layout.wide;

const ShellContext = createContext<{ sidebar: boolean }>({ sidebar: false });
export const AdminShellProvider = ShellContext.Provider;
/** `sidebar: true` — chap menyu ko'rinib turibdi (asosiy sahifalarda "orqaga" tugmasi kerak emas). */
export const useAdminShell = () => useContext(ShellContext);

type Item = { href: Href; match: RegExp; label: TKey; icon: IconName; active: IconName; badge?: 'fresh' };
const ITEMS: Item[] = [
  { href: '/admin', match: /^\/admin\/?$/, label: 'admin.nav.home', icon: 'speedometer-outline', active: 'speedometer' },
  { href: '/admin/orders', match: /^\/admin\/orders?(\/|$)/, label: 'admin.orders', icon: 'receipt-outline', active: 'receipt', badge: 'fresh' },
  { href: '/admin/products', match: /^\/admin\/products?(\/|$)/, label: 'admin.products', icon: 'cube-outline', active: 'cube' },
  { href: '/admin/banners', match: /^\/admin\/banners?(\/|$)/, label: 'admin.banners', icon: 'images-outline', active: 'images' },
  { href: '/admin/settings', match: /^\/admin\/settings(\/|$)/, label: 'admin.settings', icon: 'settings-outline', active: 'settings' },
];

/** Noutbuk uchun chap menyu: bo'limlar, yangi buyurtmalar soni, chiqish. */
export function AdminSidebar() {
  const { t } = useT();
  const pathname = usePathname();
  const account = useAccount();
  const { orders } = useAdminOrders(300);
  const fresh = useMemo(() => orders.filter((o) => o.holat === 'yangi').length, [orders]);

  // Brauzer yorlig'ida yangi buyurtmalar soni: boshqa oynada ishlayotganda ham ko'rinadi.
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const base = t('admin.title');
    document.title = fresh ? `(${fresh}) ${base}` : base;
  }, [fresh, t]);

  return (
    <View style={styles.side} accessibilityRole="menu">
      <View style={styles.brand}>
        <LogoMark size={40} />
        <View style={styles.flex}>
          <Txt variant="bodyStrong" numberOfLines={1}>{t('app.name')}</Txt>
          <Txt variant="tiny" numberOfLines={1}>{t('admin.title')}</Txt>
        </View>
      </View>
      <View style={styles.nav}>
        {ITEMS.map((item) => {
          const on = item.match.test(pathname);
          return (
            <NavItem key={item.label} label={t(item.label)} icon={on ? item.active : item.icon} on={on}
              badge={item.badge === 'fresh' && fresh ? fresh : undefined}
              onPress={() => { if (pathname !== item.href) router.navigate(item.href); }} />
          );
        })}
      </View>
      <View style={styles.flex} />
      <View style={styles.footer}>
        {account.email ? <Txt variant="tiny" numberOfLines={1} style={styles.email}>{account.email}</Txt> : null}
        <NavItem label={t('admin.signOut')} icon="log-out-outline" danger onPress={() => void adminSignOut()} />
      </View>
    </View>
  );
}

function NavItem({ label, icon, on, badge, danger, onPress }: { label: string; icon: IconName; on?: boolean; badge?: number; danger?: boolean; onPress: () => void }) {
  const [hover, setHover] = useState(false);
  const color = danger ? colors.sale : on ? colors.primary : colors.text;
  return (
    <Pressable onPress={onPress} onHoverIn={() => setHover(true)} onHoverOut={() => setHover(false)} accessibilityRole="menuitem"
      accessibilityState={{ selected: !!on }} accessibilityLabel={badge ? `${label}: ${badge}` : label}
      style={[styles.item, on && styles.itemOn, hover && !on && styles.itemHover]}>
      <Icon name={icon} size={20} color={color} />
      <Txt variant="bodyStrong" color={color} style={styles.flex} numberOfLines={1}>{label}</Txt>
      {badge ? <View style={styles.badge}><Txt variant="tiny" color={colors.white} style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Txt></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  side: { width: 248, backgroundColor: colors.white, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.line, paddingVertical: 16, paddingHorizontal: 12 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 8, paddingBottom: 18 },
  nav: { gap: 4 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 12, borderRadius: radius.md },
  itemOn: { backgroundColor: colors.tint },
  itemHover: { backgroundColor: colors.surfaceAlt },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, backgroundColor: colors.sale, alignItems: 'center', justifyContent: 'center' },
  badgeText: { lineHeight: 14 },
  footer: { gap: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 12 },
  email: { paddingHorizontal: 12 },
});
