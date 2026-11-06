import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path, Polygon } from 'react-native-svg';

import { colors, gradients } from '../../theme/tokens';
import { LOGO, N_PATH, NINES, tailPolygon } from './geometry';

/** N99 so'z-belgisi. `tone="white"` — ko'k fon ustida. */
export function Logo({ height = 28, tone = 'brand' }: { height?: number; tone?: 'brand' | 'white' }) {
  const ink = tone === 'white' ? colors.white : colors.primary;
  const hub = tone === 'white' ? colors.sky : colors.skyStrong;
  const width = (height * LOGO.width) / LOGO.height;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${LOGO.width} ${LOGO.height}`} accessibilityLabel="N99" accessibilityRole="image">
      <Path d={N_PATH} stroke={ink} strokeWidth={LOGO.stroke} fill="none" />
      {NINES.map(({ cx, cy }) => (
        <G9 key={cx} cx={cx} cy={cy} ink={ink} hub={hub} />
      ))}
    </Svg>
  );
}

function G9({ cx, cy, ink, hub }: { cx: number; cy: number; ink: string; hub: string }) {
  return (
    <>
      <Circle cx={cx} cy={cy} r={LOGO.ringR} stroke={ink} strokeWidth={LOGO.stroke} fill="none" />
      <Polygon points={tailPolygon(cx, cy)} fill={ink} />
      <Circle cx={cx} cy={cy} r={LOGO.hubR} fill={hub} />
    </>
  );
}

/** Ilova ikonkasi ko'rinishidagi belgi (ko'k kvadrat ichida oq logotip). */
export function LogoMark({ size = 56 }: { size?: number }) {
  return (
    <LinearGradient colors={gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.mark, { width: size, height: size, borderRadius: size * 0.26 }]}>
      <View style={styles.glow} />
      <Logo height={size * 0.3} tone="white" />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  glow: { position: 'absolute', top: '-30%', left: '-30%', width: '90%', height: '90%', borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)' },
});
