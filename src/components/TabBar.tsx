import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { useT, type TKey } from '../i18n';
import { haptic } from '../lib/haptics';
import { useCartCount } from '../state/cart';
import { useFavorites } from '../state/prefs';
import { spring } from '../theme/motion';
import { colors, fonts } from '../theme/tokens';
import { Icon, type IconName } from './ui/Icon';

const TABS: Record<string, { label: TKey; icon: IconName; active: IconName }> = {
  index: { label: 'tab.home', icon: 'home-outline', active: 'home' },
  catalog: { label: 'tab.catalog', icon: 'grid-outline', active: 'grid' },
  cart: { label: 'tab.cart', icon: 'cart-outline', active: 'cart' },
  favorites: { label: 'tab.favorites', icon: 'heart-outline', active: 'heart' },
  profile: { label: 'tab.profile', icon: 'person-outline', active: 'person' },
};

const PILL_W = 58;

/** Pastki menyu: tanlangan bo'lim ostida ko'k "kapsula" suriladi, savat soni sakrab yangilanadi. */
export function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { t } = useT();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const itemW = width / count;
  const x = useSharedValue(0);
  useEffect(() => {
    if (itemW) x.value = withSpring(state.index * itemW + (itemW - PILL_W) / 2, spring.snappy);
  }, [state.index, itemW, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.row} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
        {width > 0 ? <Animated.View style={[styles.pill, pill]} /> : null}
        {state.routes.map((route, index) => {
          const meta = TABS[route.name];
          if (!meta) return null;
          const focused = index === state.index;
          const onPress = () => {
            const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              haptic.tap();
              navigateToTab(route.key);
            }
          };
          return (
            <TabItem key={route.key} label={t(meta.label)} icon={focused ? meta.active : meta.icon} focused={focused}
              onPress={onPress} onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
              badge={route.name === 'cart' ? 'cart' : route.name === 'favorites' ? 'fav' : undefined} position={`${index + 1}/${count}`} />
          );
        })}
      </View>
    </View>
  );
}

function TabItem({ label, icon, focused, onPress, onLongPress, badge, position }: {
  label: string; icon: IconName; focused: boolean; onPress: () => void; onLongPress: () => void; badge?: 'cart' | 'fav'; position: string;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (focused) scale.value = withSequence(withSpring(1.18, { damping: 9, stiffness: 380 }), withSpring(1, spring.bouncy));
  }, [focused, scale]);
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.item} accessibilityRole="tab" accessibilityState={{ selected: focused }}
      accessibilityLabel={Platform.OS === 'ios' ? `${label}, ${position}` : label}>
      <Animated.View style={[styles.iconBox, iconStyle]}>
        <Icon name={icon} size={23} color={focused ? colors.primary : colors.muted} />
        {badge === 'cart' ? <CartBadge /> : badge === 'fav' ? <FavDot /> : null}
      </Animated.View>
      <Animated.Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={[styles.label, { color: focused ? colors.primary : colors.muted, fontFamily: focused ? fonts.bold : fonts.semibold }]}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

function CartBadge() {
  const n = useCartCount();
  const prev = useRef(n);
  const s = useSharedValue(1);
  useEffect(() => {
    if (n > prev.current) s.value = withSequence(withSpring(1.45, { damping: 7, stiffness: 420 }), withSpring(1, spring.bouncy));
    prev.current = n;
  }, [n, s]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  if (!n) return null;
  return (
    <Animated.View style={[styles.badge, style]}>
      <Animated.Text style={styles.badgeText} maxFontSizeMultiplier={1}>{n > 99 ? '99+' : n}</Animated.Text>
    </Animated.View>
  );
}

function FavDot() {
  const n = useFavorites().length;
  if (!n) return null;
  return <View style={styles.dot} />;
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 6,
    ...Platform.select({
      ios: { shadowColor: '#0F2338', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 12 },
      default: { elevation: 12 },
    }),
  },
  row: { flexDirection: 'row', width: '100%', maxWidth: 760, alignSelf: 'center' },
  pill: { position: 'absolute', top: 0, left: 0, width: PILL_W, height: 32, borderRadius: 16, backgroundColor: colors.tint },
  item: { flex: 1, alignItems: 'center', gap: 3, minHeight: 50 },
  iconBox: { width: PILL_W, height: 32, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5, lineHeight: 14 },
  badge: { position: 'absolute', top: 0, right: 10, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.sale, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  badgeText: { color: colors.white, fontSize: 10, fontFamily: fonts.heavy, lineHeight: 12 },
  dot: { position: 'absolute', top: 4, right: 16, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sale, borderWidth: 1.5, borderColor: colors.white },
});
