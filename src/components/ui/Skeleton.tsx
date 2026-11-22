import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { colors } from '../../theme/tokens';

/**
 * Yuklanish joyi: sokin kulrang blok, hech qanday takrorlanuvchi animatsiyasiz.
 * Avval ustidan yaltiroq chiziq yugurardi — ekran "likillardi" va aynan yuklanish paytida
 * arzon telefon protsessorini band qilardi. Endi yuklanish vaqtida telefon faqat ma'lumot bilan band.
 */
export function Skeleton({ width = '100%', height = 14, radius = 8, style }: {
  width?: DimensionValue; height?: DimensionValue; radius?: number; style?: StyleProp<ViewStyle>;
}) {
  return <View style={[{ width, height, borderRadius: radius }, styles.base, style]} />;
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.photo },
});
