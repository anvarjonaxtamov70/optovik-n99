import { LinearGradient } from 'expo-linear-gradient';
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
import { colors, gradients, radius, shadow } from '../../theme/tokens';
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
        scaleTo={0.96}
        depth={1}
        accessibilityLabel={`${product.nomi}: ${t('product.add')}`}
        style={[styles.addWrap, live && shadow.buttonSm]}
      >
        <LinearGradient colors={gradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.add, { height: h }]}>
          <PressOverlay color={colors.ink} max={0.14} radius={radius.sm} />
          <Icon name="cart-outline" size={size === 'md' ? 19 : 17} color={colors.white} />
          <Txt variant="smallStrong" color={colors.white}>{t('product.add')}</Txt>
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Soya uchun fon shaffof bo'lmasin (iOS tez chizadi, Android to'g'ri shaklda chizadi).
  addWrap: { borderRadius: radius.sm, backgroundColor: colors.primary },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.sm },
  off: { borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
});
