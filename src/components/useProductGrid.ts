import { useWindowDimensions } from 'react-native';

export function useProductGrid() {
  const { width, fontScale } = useWindowDimensions();
  const columns = width < 340 || fontScale >= 1.5 ? 1 : 2;
  return { columns, cardWidth: (Math.min(width, 760) - 32 - (columns - 1) * 12) / columns };
}
