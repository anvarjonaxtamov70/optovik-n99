import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';

import type { Product } from '../../domain/products';
import { MAX_QTY } from '../../domain/cart';
import { useT } from '../../i18n';
import { haptic } from '../../lib/haptics';
import { cart, useQty } from '../../state/cart';
import { useCatalogLive } from '../../state/catalog';
import { showToast } from '../../state/toast';
import { colors, gradients, radius } from '../../theme/tokens';
import { Icon } from '../ui/Icon';
import { PressableScale } from '../ui/PressableScale';
import { Stepper } from '../ui/Stepper';
import { Txt } from '../ui/Txt';

/** Kartadagi "Savatga" tugmasi: bosilganda miqdor tanlagichga aylanadi. */
export function AddToCart({ product, size = 'sm' }: { product: Product; size?: 'sm' | 'md' }) {
  const qty = useQty(product.id);
  const live = useCatalogLive();
  const { t } = useT();
  const soldOut = product.qoldiq <= 0;
  const h = size === 'md' ? 44 : 36;
  if (soldOut) {
    return (
      <View style={[styles.off, { height: h }]}>
        <Txt variant="smallStrong" color={colors.faint}>{t('product.soldOut')}</Txt>
      </View>
    );
  }
  if (qty > 0) {
    return (
      <Animated.View entering={FadeIn.duration(160)}>
        <Stepper value={qty} max={Math.min(product.qoldiq, MAX_QTY)} size={size === 'md' ? 'md' : 'sm'}
          labelInc={`${product.nomi}: +1`} labelDec={`${product.nomi}: −1`}
          onInc={() => {
            if (qty >= product.qoldiq) { haptic.warning(); showToast(t('product.limit'), { kind: 'error' }); return; }
            cart.inc(product);
          }}
          onDec={() => cart.dec(product)} />
      </Animated.View>
    );
  }
  return (
    <Animated.View entering={ZoomIn.springify().damping(16)}>
      <PressableScale
        onPress={() => { haptic.light(); cart.add(product); }}
        disabled={!live}
        accessibilityLabel={`${product.nomi}: ${t('product.add')}`}
        style={styles.addWrap}
      >
        <LinearGradient colors={gradients.button} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.add, { height: h }]}>
          <Icon name="cart-outline" size={size === 'md' ? 19 : 17} color={colors.white} />
          <Txt variant="smallStrong" color={colors.white}>{t('product.add')}</Txt>
        </LinearGradient>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  addWrap: { borderRadius: radius.sm },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.sm },
  off: { borderRadius: radius.sm, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
});
