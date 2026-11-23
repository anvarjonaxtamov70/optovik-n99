import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT, type TKey } from '../i18n';
import { haptic } from '../lib/haptics';
import { useCartCount } from '../state/cart';
import { useFavorites } from '../state/prefs';
import { spring } from '../theme/motion';
import { colors, fonts, shadow } from '../theme/tokens';
import { GlassFill, LIQUID_GLASS } from './ui/Glass';
import { Icon, type IconName } from './ui/Icon';

const TABS: Record<string, { label: TKey; icon: IconName; active: IconName }> = {
  index: { label: 'tab.home', icon: 'home-outline', active: 'home' },
  catalog: { label: 'tab.catalog', icon: 'grid-outline', active: 'grid' },
  cart: { label: 'tab.cart', icon: 'cart-outline', active: 'cart' },
  favorites: { label: 'tab.favorites', icon: 'heart-outline', active: 'heart' },
  profile: { label: 'tab.profile', icon: 'person-outline', active: 'person' },
};

/** Suzuvchi menyu kapsulasining balandligi. */
export const TAB_BAR_HEIGHT = 62;
const PILL_INSET = 5;

/** Kapsulaning ekran pastidan masofasi (uy tugmasi chizig'i / Android tugmalari ustida). */
function barBottom(insetBottom: number) {
  return Math.max(insetBottom - 6, 10);
}

/**
 * Bo'lim ekranlarining pastki bo'shlig'i: kontent suzuvchi menyu ostida qolib ketmasin.
 * `extra` — menyu ustida yana nimadir tursa (masalan, savatdagi «Rasmiylashtirish» paneli).
 */
export function useTabBarSpace(extra = 0) {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + barBottom(insets.bottom) + 12 + extra;
}

/** Suzuvchi panel (masalan, savat jami) menyu ustida turishi uchun pastdan masofa. */
export function useAboveTabBar() {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + barBottom(insets.bottom) + 8;
}

/**
 * Pastki menyu — iOS 26 dagidek suzib turadigan «shisha» kapsula: ostidan ro'yxat o'tib ko'rinadi
 * (iOS 26 da haqiqiy shisha, boshqa telefonlarda arzon taqlid). Tanlangan bo'lim ostida ko'k kapsula suriladi.
 */
export function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { t } = useT();
  const [width, setWidth] = useState(0);
  const count = state.routes.length;
  const itemW = width / count;
  const x = useSharedValue(0);
  useEffect(() => {
    if (itemW) x.set(withSpring(state.index * itemW + PILL_INSET, spring.snappy));
  }, [state.index, itemW, x]);
  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: barBottom(insets.bottom) }]}>
      <View style={[styles.bar, !LIQUID_GLASS && styles.barFace, !LIQUID_GLASS && shadow.glass]}>
        <GlassFill tone="light" radius={TAB_BAR_HEIGHT / 2} real />
        <View style={styles.row} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
          {width > 0 ? (
            <Animated.View style={[styles.pill, { width: itemW - PILL_INSET * 2 }, pill]}>
              <GlassFill tone="tint" radius={(TAB_BAR_HEIGHT - PILL_INSET * 2) / 2} />
            </Animated.View>
          ) : null}
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
    </View>
  );
}

function TabItem({ label, icon, focused, onPress, onLongPress, badge, position }: {
  label: string; icon: IconName; focused: boolean; onPress: () => void; onLongPress: () => void; badge?: 'cart' | 'fav'; position: string;
}) {
  const scale = useSharedValue(1);
  useEffect(() => {
    // Tanlanganda ikonka bir marta yengil "kattalashib" qaytadi.
    if (focused) scale.set(withSequence(withTiming(1.1, { duration: 110, easing: Easing.out(Easing.quad) }), withSpring(1, spring.snappy)));
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
    if (n > prev.current) s.set(withSequence(withTiming(1.25, { duration: 120, easing: Easing.out(Easing.quad) }), withSpring(1, spring.snappy)));
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
  wrap: { position: 'absolute', left: 12, right: 12, alignItems: 'center' },
  bar: { width: '100%', maxWidth: 560, height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_HEIGHT / 2 },
  // Shisha taqlidida soya tez chizilishi uchun shaffof bo'lmagan yuz (iOS 26 shishasida yuz yo'q — orqadagi kontent ko'rinadi).
  barFace: { backgroundColor: colors.white },
  row: { flex: 1, flexDirection: 'row' },
  pill: { position: 'absolute', top: PILL_INSET, bottom: PILL_INSET, left: 0, borderRadius: (TAB_BAR_HEIGHT - PILL_INSET * 2) / 2 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconBox: { width: 44, height: 28, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 10.5, lineHeight: 13 },
  badge: { position: 'absolute', top: -3, right: 0, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.sale, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  badgeText: { color: colors.white, fontSize: 10, fontFamily: fonts.heavy, lineHeight: 12 },
  dot: { position: 'absolute', top: 1, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.sale, borderWidth: 1.5, borderColor: colors.white },
});
