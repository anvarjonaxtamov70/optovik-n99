import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useT } from '../../i18n';
import { colors } from '../../theme/tokens';
import { IconButton } from './IconButton';
import { Txt } from './Txt';

export function goBack(fallback: string = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback as never);
}

/** Ichki sahifalar sarlavhasi: orqaga tugmasi, nom va o'ng tomondagi amallar. */
export function Header({ title, subtitle, right, back = true, transparent, onBack }: {
  title?: string; subtitle?: string; right?: ReactNode; back?: boolean; transparent?: boolean; onBack?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { t } = useT();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 6 }, transparent ? styles.transparent : styles.solid]}>
      <View style={styles.row}>
        {back ? <IconButton icon="chevron-back" label={t('common.back')} onPress={onBack ?? (() => goBack())} size={40} bg={transparent ? colors.white : colors.surfaceAlt} elevated={transparent} /> : <View style={styles.spacer} />}
        <View style={styles.titleBox}>
          {title ? <Txt variant="h3" numberOfLines={1} center accessibilityRole="header">{title}</Txt> : null}
          {subtitle ? <Txt variant="tiny" numberOfLines={1} center>{subtitle}</Txt> : null}
        </View>
        <View style={styles.right}>{right ?? <View style={styles.spacer} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 12, paddingBottom: 8, zIndex: 10 },
  solid: { backgroundColor: colors.white, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  transparent: { position: 'absolute', top: 0, left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  titleBox: { flex: 1, alignItems: 'center' },
  right: { minWidth: 40, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  spacer: { width: 40, height: 40 },
});
