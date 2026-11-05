import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, shadow } from '../../theme/tokens';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Txt } from './Txt';

export function IconButton({
  icon, onPress, label, size = 44, color = colors.ink, bg = colors.white, badge, elevated, style, iconSize,
}: {
  icon: IconName; onPress?: () => void; label: string; size?: number; color?: string; bg?: string;
  badge?: number; elevated?: boolean; style?: StyleProp<ViewStyle>; iconSize?: number;
}) {
  return (
    <PressableScale
      onPress={onPress}
      feedback="tap"
      scaleTo={0.9}
      accessibilityLabel={label}
      hitSlop={6}
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg }, styles.center, elevated && shadow.soft, style]}
    >
      <Icon name={icon} size={iconSize ?? Math.round(size * 0.5)} color={color} />
      {!!badge && badge > 0 && (
        <View style={styles.badge}><Txt variant="tiny" color={colors.white} style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Txt></View>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -2, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4, backgroundColor: colors.sale, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.white },
  badgeText: { fontSize: 10, lineHeight: 12 },
});
