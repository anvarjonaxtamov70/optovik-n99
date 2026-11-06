import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { ComponentProps } from 'react';

import { colors } from '../../theme/tokens';

export type IconName = ComponentProps<typeof Ionicons>['name'];
export type PartIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export function Icon({ name, size = 22, color = colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <Ionicons name={name} size={size} color={color} />;
}

/** Avtomobil detallari uchun ikonkalar (MaterialCommunityIcons). */
export function PartIcon({ name, size = 24, color = colors.primary }: { name: string; size?: number; color?: string }) {
  const glyph = (name in MaterialCommunityIcons.glyphMap ? name : 'package-variant-closed') as PartIconName;
  return <MaterialCommunityIcons name={glyph} size={size} color={color} />;
}
