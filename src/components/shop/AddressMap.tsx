import { StyleSheet, View } from 'react-native';

import { useT } from '../../i18n';
import { colors } from '../../theme/tokens';
import { PartIcon } from '../ui/Icon';
import { Txt } from '../ui/Txt';
import type { AddressMapProps } from './AddressMap.types';

/**
 * Brauzer uchun o'rinbosar: web versiya faqat admin paneli, xarita kutubxonasi brauzerda ishlamaydi.
 * Telefonda `AddressMap.native.tsx` ishlatiladi.
 */
export function AddressMap({ style }: AddressMapProps) {
  const { t } = useT();
  return (
    <View style={[styles.box, style]}>
      <PartIcon name="map-search-outline" size={44} color={colors.faint} />
      <Txt variant="small" center style={styles.text}>{t('address.mapPhoneOnly')}</Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.photo, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24 },
  text: { maxWidth: 260 },
});
