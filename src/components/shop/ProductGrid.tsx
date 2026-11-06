import { useWindowDimensions } from 'react-native';

import { layout } from '../../theme/tokens';

/** 2 ustunli panjara; planshetda 3–4 ustun. Kartaning kengligi bir xil hisoblanadi. */
export function useGrid(gap = 10, padding = layout.gutter) {
  const { width, fontScale } = useWindowDimensions();
  const inner = Math.min(width, 1100) - padding * 2;
  const columns = fontScale > 1.6 && width < 500 ? 1 : width >= 900 ? 4 : width >= 640 ? 3 : 2;
  const cardWidth = Math.floor((inner - gap * (columns - 1)) / columns);
  return { columns, cardWidth, gap, padding };
}
