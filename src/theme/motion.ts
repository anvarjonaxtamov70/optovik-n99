import { Easing } from 'react-native-reanimated';

export const spring = {
  snappy: { damping: 18, stiffness: 320, mass: 0.7 },
  bouncy: { damping: 11, stiffness: 260, mass: 0.7 },
  soft: { damping: 20, stiffness: 160, mass: 0.9 },
} as const;

export const ease = {
  out: Easing.bezier(0.22, 1, 0.36, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
};
