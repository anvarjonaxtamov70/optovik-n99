import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { statusKey } from '../../components/shop/OrderBits';
import { Button } from '../../components/ui/Button';
import { Card, Pill } from '../../components/ui/Controls';
import { EmptyState } from '../../components/ui/EmptyState';
import { Field } from '../../components/ui/Field';
import { Header } from '../../components/ui/Header';
import { Icon } from '../../components/ui/Icon';
import { Skeleton } from '../../components/ui/Skeleton';
import { Txt } from '../../components/ui/Txt';
import { isActive, nextStatus, recomputeTotals, type Order, type OrderStatus } from '../../domain/order';
import { displayPhone } from '../../domain/phone';
import { useT } from '../../i18n';
import { confirmAsync } from '../../lib/confirm';
import { classifyError } from '../../lib/firebase';
import { haptic } from '../../lib/haptics';
import { callPhone } from '../../lib/links';
import { adminSaveNote, adminSetStatus, useOrder } from '../../state/orders';
import { showToast } from '../../state/toast';
import { colors } from '../../theme/tokens';
import { OrderView } from '../OrderScreen';

export default function AdminOrder() {
  const { uid, id } = useLocalSearchParams<{ uid: string; id: string }>();
  const { order, loading } = useOrder(uid, id);
  const { t } = useT();
  if (!order) {
    return (
      <View style={styles.root}>
        <Header title={t('admin.orders')} />
        {loading ? <View style={styles.pad}><Skeleton height={240} radius={18} /></View> : <EmptyState icon="receipt-outline" title={t('orders.notFound')} />}
      </View>
    );
  }
  return <OrderView order={order} admin={<AdminPanel order={order} />} />;
}

function AdminPanel({ order: o }: { order: Order }) {
  const { t, money } = useT();
  const [busy, setBusy] = useState<OrderStatus | 'note' | null>(null);
  const [note, setNote] = useState(o.adminIzoh ?? '');
  const next = nextStatus(o);
  const totals = recomputeTotals(o);
  const mismatch = totals.jami !== o.jami;

  const move = async (s: OrderStatus) => {
    setBusy(s);
    try {
      await adminSetStatus(o, s);
      haptic.success();
      showToast(t('admin.updated'), { kind: 'success' });
    } catch (e) {
      haptic.warning();
      showToast(classifyError(e) === 'permission' ? (s === 'tasdiqlandi' || !o.zaxira ? t('admin.stockError') : t('admin.err.permission')) : t('common.error'), { kind: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(40).duration(320)}>
      <Card style={styles.gap}>
        <View style={styles.row}>
          <Icon name="person-circle-outline" size={22} color={colors.primary} />
          <View style={styles.flex}>
            <Txt variant="bodyStrong">{o.mijoz.ism}</Txt>
            <Txt variant="small">{displayPhone(o.mijoz.telefon)}</Txt>
          </View>
          <Pill text={o.zaxira ? t('admin.stockReserved') : t('admin.stockWillReserve')} tone={o.zaxira ? 'success' : 'muted'} />
        </View>
        {Platform.OS === 'web' ? (
          // Kompyuterdan qo'ng'iroq qilib bo'lmaydi — raqamni nusxalab, telefonda teriladi.
          <Button title={t('admin.copyPhone')} icon="copy-outline" variant="secondary"
            onPress={() => void Clipboard.setStringAsync(o.mijoz.telefon).then(() => showToast(t('common.copied'), { kind: 'success' }))} />
        ) : (
          <Button title={t('admin.callCustomer')} icon="call" variant="secondary" onPress={() => callPhone(o.mijoz.telefon)} />
        )}
        {mismatch ? (
          <View style={styles.warn}>
            <Icon name="warning-outline" size={18} color={colors.warning} />
            <Txt variant="smallStrong" color={colors.warning} style={styles.flex}>{t('admin.totalMismatch', { sum: money(totals.jami) })}</Txt>
          </View>
        ) : null}
        {next ? (
          <Button title={t('admin.moveTo', { status: t(statusKey(next, o.yetkazish.turi)) })} icon="arrow-forward-circle-outline" size="lg"
            loading={busy === next} disabled={!!busy} onPress={() => void move(next)} />
        ) : null}
        {isActive(o.holat) ? (
          <Button title={t('admin.cancelOrder')} variant="ghost" loading={busy === 'bekor'} disabled={!!busy}
            onPress={() => void confirmAsync(t('admin.cancelOrder'), t('admin.cancelConfirm'), { ok: t('common.yes'), cancel: t('common.no'), destructive: true })
              .then((ok) => { if (ok) void move('bekor'); })} />
        ) : null}
        <Field label={t('admin.adminNote')} value={note} onChangeText={setNote} multiline maxLength={500}
          onBlur={() => { if (note !== (o.adminIzoh ?? '')) void adminSaveNote(o, note).then(() => showToast(t('common.saved'), { kind: 'success' })).catch(() => showToast(t('common.error'), { kind: 'error' })); }} />
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  pad: { padding: 16 },
  flex: { flex: 1 },
  gap: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  warn: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 12, backgroundColor: colors.warningSoft },
});
