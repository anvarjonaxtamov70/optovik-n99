import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, layout } from '../../theme/tokens';

/**
 * Pastda qotib turadigan tugmalar paneli. Telefonda tugma butun kenglikda,
 * noutbukda (`wide`) — o'ng tomonda, sahifa kengligi bilan bir xil chegarada.
 */
export function BottomBar({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={[styles.inner, wide && styles.wide]}>{children}</View>
    </View>
  );
}

/** Noutbukda pastki paneldagi tugma kengligi. */
export const barButton = { minWidth: 220 } as const;

const styles = StyleSheet.create({
  bar: {
    position: 'absolute', left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 12,
    backgroundColor: colors.white, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line,
  },
  inner: { width: '100%', maxWidth: layout.maxWidth, alignSelf: 'center', flexDirection: 'row', gap: 10 },
  wide: { maxWidth: layout.wideMaxWidth, justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 8 },
});
