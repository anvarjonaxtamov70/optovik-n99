import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming, ZoomIn } from 'react-native-reanimated';

import { orderNumber, statusFlow, type Order, type OrderIndex, type OrderStatus } from '../../domain/order';
import type { DeliveryKind } from '../../domain/cart';
import { displayPhone } from '../../domain/phone';
import { useT, type TKey } from '../../i18n';
import { ease } from '../../theme/motion';
import { colors, radius, shadow } from '../../theme/tokens';
import { Icon, type IconName } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { Txt } from '../ui/Txt';

export const STATUS_ICON: Record<OrderStatus, IconName> = {
  yangi: 'receipt-outline', tasdiqlandi: 'checkmark-done-outline', yolda: 'bicycle-outline', tayyor: 'storefront-outline',
  yetkazildi: 'bag-check-outline', bekor: 'close-circle-outline',
};
export const STATUS_TONE: Record<OrderStatus, [string, string]> = {
  yangi: [colors.tint, colors.primary], tasdiqlandi: ['#E7F0FF', '#2D5BD8'], yolda: [colors.warningSoft, colors.warning],
  tayyor: [colors.warningSoft, colors.warning], yetkazildi: [colors.successSoft, colors.success], bekor: [colors.saleSoft, colors.sale],
};

export function statusKey(s: OrderStatus, kind: DeliveryKind): TKey {
  return s === 'yetkazildi' && kind === 'olib' ? 'status.yetkazildi.olib' : (`status.${s}` as TKey);
}

export function formatDate(ms: number, lang: 'uz' | 'ru', withTime = true) {
  if (!ms) return '';
  const d = new Date(ms);
  const months = lang === 'ru'
    ? ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
    : ['yan', 'fev', 'mar', 'apr', 'may', 'iyn', 'iyl', 'avg', 'sen', 'okt', 'noy', 'dek'];
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${d.getDate()} ${months[d.getMonth()]}${d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : ''}${withTime ? ', ' + time : ''}`;
}

export function StatusPill({ status, kind }: { status: OrderStatus; kind: DeliveryKind }) {
  const { t } = useT();
  const [bg, fg] = STATUS_TONE[status];
  return (
    <View style={[styles.pill, { backgroundColor: bg }]}>
      <Icon name={STATUS_ICON[status]} size={14} color={fg} />
      <Txt variant="tiny" color={fg} style={styles.pillText}>{t(statusKey(status, kind))}</Txt>
    </View>
  );
}

/** Holat chizig'i: bajarilgan bosqichlar bo'yab chiqiladi, joriy bosqich "nafas oladi". */
export function OrderTimeline({ order }: { order: Pick<Order, 'holat' | 'yetkazish' | 'tarix'> }) {
  const { t, lang } = useT();
  const flow = statusFlow(order.yetkazish.turi);
  const cancelled = order.holat === 'bekor';
  const current = cancelled ? -1 : flow.indexOf(order.holat);
  const fill = useSharedValue(0);
  const pulse = useSharedValue(0);
  useEffect(() => {
    fill.value = withDelay(150, withTiming(current < 0 ? 0 : current / (flow.length - 1), { duration: 900, easing: ease.out }));
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0, { duration: 900 })), -1);
  }, [current, flow.length, fill, pulse]);
  const bar = useAnimatedStyle(() => ({ height: `${fill.value * 100}%` }));
  const halo = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pulse.value * 0.35 }], opacity: 0.45 - pulse.value * 0.35 }));
  if (cancelled) {
    return (
      <View style={styles.cancelRow}>
        <Icon name="close-circle" size={22} color={colors.sale} />
        <Txt variant="bodyStrong" color={colors.sale}>{t('status.bekor')}</Txt>
      </View>
    );
  }
  return (
    <View style={styles.timeline}>
      <View style={styles.track}><Animated.View style={[styles.trackFill, bar]} /></View>
      {flow.map((s, i) => {
        const done = i <= current;
        const isCurrent = i === current;
        const at = order.tarix[s];
        return (
          <View key={s} style={styles.step}>
            <View style={styles.nodeBox}>
              {isCurrent && current < flow.length - 1 ? <Animated.View style={[styles.halo, halo]} /> : null}
              <View style={[styles.node, done ? styles.nodeOn : styles.nodeOff]}>
                {done ? <Animated.View entering={ZoomIn.delay(150 + i * 120)}><Icon name={i < current || i === flow.length - 1 ? 'checkmark' : STATUS_ICON[s]} size={14} color={colors.white} /></Animated.View> : null}
              </View>
            </View>
            <View style={styles.stepText}>
              <Txt variant={isCurrent ? 'bodyStrong' : 'body'} color={done ? colors.ink : colors.faint}>{t(statusKey(s, order.yetkazish.turi))}</Txt>
              {isCurrent ? <Txt variant="small">{t(`status.hint.${s}` as TKey)}</Txt> : null}
            </View>
            {at ? <Txt variant="tiny">{formatDate(at, lang)}</Txt> : null}
          </View>
        );
      })}
    </View>
  );
}

export function OrderCard({ order, onPress, showCustomer }: { order: Order | OrderIndex; onPress: () => void; showCustomer?: boolean }) {
  const { t, money, lang } = useT();
  const kind = 'yetkazish' in order ? order.yetkazish.turi : order.turi;
  const name = 'mijoz' in order ? order.mijoz.ism : order.ism;
  const phone = 'mijoz' in order ? order.mijoz.telefon : order.telefon;
  return (
    <PressableScale onPress={onPress} scaleTo={0.98} style={[styles.card, shadow.soft]} accessibilityLabel={t('orders.item', { num: orderNumber(order.raqam) })}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: STATUS_TONE[order.holat][0] }]}>
          <Icon name={STATUS_ICON[order.holat]} size={20} color={STATUS_TONE[order.holat][1]} />
        </View>
        <View style={styles.flex}>
          <Txt variant="bodyStrong">{t('orders.item', { num: orderNumber(order.raqam) })}</Txt>
          <Txt variant="tiny">{formatDate(order.createdAt, lang)}{showCustomer ? ` · ${name} · ${displayPhone(phone)}` : ''}</Txt>
        </View>
        <Icon name="chevron-forward" size={18} color={colors.faint} />
      </View>
      <View style={styles.cardBottom}>
        <StatusPill status={order.holat} kind={kind} />
        <Txt variant="tiny" style={styles.flex} numberOfLines={1}>{t('common.items', { n: order.soni })} · {kind === 'kuryer' ? t('checkout.courier') : t('checkout.pickup')}</Txt>
        <Txt variant="bodyStrong">{money(order.jami)}</Txt>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.pill, alignSelf: 'flex-start' },
  pillText: { fontSize: 11 },
  cancelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeline: { paddingLeft: 2 },
  track: { position: 'absolute', left: 14, top: 16, bottom: 16, width: 3, borderRadius: 2, backgroundColor: colors.line, overflow: 'hidden' },
  trackFill: { width: '100%', backgroundColor: colors.primary, borderRadius: 2 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 52 },
  nodeBox: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: colors.primary },
  node: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  nodeOn: { backgroundColor: colors.primary },
  nodeOff: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.lineStrong },
  stepText: { flex: 1, paddingTop: 4, gap: 2 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 14, gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  cardBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
