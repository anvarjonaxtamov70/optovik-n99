import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { colors, gradients } from '../../theme/tokens';
import { Button } from './Button';
import { Icon, PartIcon, type IconName } from './Icon';
import { Txt } from './Txt';

/** Bo'sh holat: bir marta yumshoq paydo bo'ladi, keyin tinch turadi (tinimsiz suzish va "nafas" olib tashlandi). */
export function EmptyState({ icon, partIcon, title, text, action, compact }: {
  icon?: IconName; partIcon?: string; title: string; text?: string; action?: { label: string; onPress: () => void }; compact?: boolean;
}) {
  const size = compact ? 96 : 124;
  return (
    <Animated.View entering={FadeIn.duration(240)} style={[styles.wrap, compact && styles.compact]}>
      <View style={[styles.halo, { width: size + 36, height: size + 36, borderRadius: (size + 36) / 2 }]}>
        <LinearGradient colors={gradients.sky} style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}>
          {partIcon ? <PartIcon name={partIcon} size={size * 0.44} color={colors.primary} /> : <Icon name={icon ?? 'cube-outline'} size={size * 0.42} color={colors.primary} />}
        </LinearGradient>
      </View>
      <Txt variant="h2" center style={styles.title}>{title}</Txt>
      {text ? <Txt variant="body" color={colors.muted} center style={styles.text}>{text}</Txt> : null}
      {action ? <Button title={action.label} onPress={action.onPress} full={false} style={styles.btn} /> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 40, gap: 6 },
  compact: { paddingVertical: 20 },
  halo: { borderWidth: 2, borderColor: colors.tint, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  title: { marginTop: 10 },
  text: { maxWidth: 320 },
  btn: { marginTop: 14, minWidth: 200 },
});
