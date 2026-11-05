import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors } from '../theme';

export type IconName = 'search' | 'filter' | 'pin' | 'arrow' | 'heart' | 'bag' | 'scale' | 'engine' | 'brake' | 'bolt' | 'grid' | 'store' | 'user' | 'cart' | 'close' | 'check' | 'sort' | 'car' | 'box';

const paths: Record<IconName, string> = {
  search: 'm20.5 20.5-5-5',
  filter: 'M4 6h6m4 0h6M4 12h10m4 0h2M4 18h2m4 0h10M10 3v6m4 0v6M6 15v6',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z',
  arrow: 'M4 12h16m-6-6 6 6-6 6',
  heart: 'M20.8 4.8a5.5 5.5 0 0 0-7.8 0l-1 1-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z',
  bag: 'M5 8h14l1 12H4L5 8Zm3 0V6a4 4 0 0 1 8 0v2',
  scale: 'M12 3v17m-4 0h8M4 6h16M5 6l-3 7h6L5 6Zm14 0-3 7h6l-3-7Z',
  engine: 'M7 4h7m-3.5 0v3M4 9H2v7m2-4H2M5 8h9l3 3h3v7h-4l-3 2H7l-2-3V8Z',
  brake: 'M9 8h.01M15 8h.01M8 14h.01M16 14h.01M12 17h.01',
  bolt: 'm13 2-9 12h7l-1 8 10-13h-8l1-7Z',
  grid: '',
  store: 'M3 9V5h18v4M4 12v9h16v-9M8 21v-6h8v6M3 9c0 4 4.5 4 4.5 0 0 4 4.5 4 4.5 0 0 4 4.5 4 4.5 0 0 4 4.5 4 4.5 0',
  user: 'M4 21v-2a8 8 0 0 1 16 0v2',
  cart: 'M2 3h3l3 13h11l3-10H6M8 20h.01M19 20h.01',
  close: 'm6 6 12 12M6 18 18 6',
  check: 'm5 12 4 4L19 6',
  sort: 'M7 3v18m-4-4 4 4 4-4M17 21V3m-4 4 4-4 4 4',
  car: 'm4 9 2-5h12l2 5M3 10h18v9H3v-9Zm2 9v2m14-2v2M6 14h2m8 0h2',
  box: 'm3 7 9-5 9 5-9 5-9-5Zm0 0v10l9 5 9-5V7M12 12v10M8 4l9 5',
};

export function Icon({ name, size = 22, color = colors.text, filled = false }: { name: IconName; size?: number; color?: string; filled?: boolean }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
    {!!paths[name] && <Path d={paths[name]} fill={filled && name === 'heart' ? color : 'none'} />}
    {name === 'search' && <Circle cx={10.5} cy={10.5} r={7.5} />}
    {name === 'pin' && <Circle cx={12} cy={10} r={2.5} />}
    {name === 'user' && <Circle cx={12} cy={6} r={4} />}
    {name === 'brake' && <><Circle cx={12} cy={12} r={10} /><Circle cx={12} cy={12} r={3} /></>}
    {name === 'grid' && [3, 14].flatMap((x) => [3, 14].map((y) => <Rect key={`${x}-${y}`} x={x} y={y} width={7} height={7} rx={1.5} />))}
  </Svg>;
}
