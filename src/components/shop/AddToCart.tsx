import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import type { Product } from '../../domain/products';
import { MAX_QTY } from '../../domain/cart';
import { useT } from '../../i18n';
import { haptic } from '../../lib/haptics';
import { cart, useQty } from '../../state/cart';
import { useCatalogLive } from '../../state/catalog';
import { showToast } from '../../state/toast';
import { colors, radius, shadow } from '../../theme/tokens';
import { GlassFill } from '../ui/Glass';
import { Icon } from '../ui/Icon';
import { PressableScale, PressOverlay } from '../ui/PressableScale';
import { Stepper } from '../ui/Stepper';
import { Txt } from '../ui/Txt';

/**
 * Kartadagi "Savatga" tugmasi: bosilganda miqdor tanlagichga aylanadi.
 * Almashish animatsiyasi faqat shu tugma bosilganda bo'ladi — ro'yxat aylantirilganda kartalar "likillamaydi".
 */
export function AddToCart({ product, size = 'sm' }: { product: Product; size?: 'sm' | 'md' }) {
  const qty = useQty(product.id);
  const live = useCatalogLive();
  const { t } = useT();
  const [touched, setTouched] = useState(false);
  const soldOut = product.qoldiq <= 0;
  // Barmoq bilan bosiladigan eng kichik o'lcham — 44 px.
  const h = size === 'md' ? 48 : 44;
  if (soldOut) {
    return (
      <View style={[styles.off, { height: h }]}>
        <GlassFill tone="muted" radius={R} />
        <Txt variant="smallStrong" color={colors.faint}>{t('product.soldOut')}</Txt>
      </View>
    );
  }
  if (qty > 0) {
    return (
      <Animated.View entering={touched ? FadeIn.duration(150) : undefined}>
        <Stepper value={qty} max={Math.min(product.qoldiq, MAX_QTY)} size={size === 'md' ? 'md' : 'sm'}
          labelInc={`${product.nomi}: +1`} labelDec={`${product.nomi}: −1`}
          onInc={() => {
            if (qty >= product.qoldiq) { haptic.warning(); showToast(t('product.limit'), { kind: 'error' }); return; }
            cart.inc(product);
          }}
          onDec={() => { setTouched(true); cart.dec(product); }} />
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={touched ? FadeIn.duration(150) : undefined}>
      <PressableScale
        onPress={() => { setTouched(true); haptic.light(); cart.add(product); }}
        disabled={!live}
        dimWhenDisabled={false}
        scaleTo={0.96}
        depth={1}
        accessibilityLabel={`${product.nomi}: ${t('product.add')}`}
        style={[styles.addWrap, { height: h, backgroundColor: live ? colors.primary : '#ECEFF3' }, live && shadow.buttonSm]}
      >
        {/* Ro'yxatdagi tugma — doim arzon shisha taqlidi (o'nlab haqiqiy shisha aylantirishni og'irlashtiradi). */}
        <GlassFill tone={live ? 'primary' : 'muted'} radius={R} />
        <PressOverlay color={colors.ink} max={0.14} radius={R} />
        <Icon name="cart-outline" size={size === 'md' ? 19 : 17} color={live ? colors.white : colors.faint} />
        <Txt variant="smallStrong" color={live ? colors.white : colors.faint}>{t('product.add')}</Txt>
      </PressableScale>
    </Animated.View>
  );
}

/** Stepper bilan bir xil burchak — «Savatga» miqdor tanlagichga aylanganda shakl sakramaydi. */
const R = radius.sm + 2;

const styles = StyleSheet.create({
  // Soya uchun fon shaffof bo'lmasin (iOS tez chizadi, Android to'g'ri shaklda chizadi).
  addWrap: { borderRadius: R, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  off: { borderRadius: R, alignItems: 'center', justifyContent: 'center' },
});
