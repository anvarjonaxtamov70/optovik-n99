import { Text, type TextProps, type TextStyle } from 'react-native';

import { colors, type as typeStyles } from '../../theme/tokens';

export type TxtVariant = keyof typeof typeStyles;

export function Txt({ variant = 'body', color, center, style, maxFontSizeMultiplier = 1.35, ...rest }: TextProps & {
  variant?: TxtVariant; color?: string; center?: boolean;
}) {
  const extra: TextStyle = { ...(color ? { color } : null), ...(center ? { textAlign: 'center' as const } : null) };
  return <Text maxFontSizeMultiplier={maxFontSizeMultiplier} {...rest} style={[typeStyles[variant], extra, style]} />;
}

export const tone = colors;
