import type { StyleProp, ViewStyle } from 'react-native';

import type { LatLng } from '../../domain/geo';

export type AddressMapProps = {
  /** Xarita ochilgandagi markaz. */
  initial: LatLng;
  /** Xaritani shu nuqtaga silliq olib borish (`seq` o'zgarganda). */
  focus: { point: LatLng; seq: number } | null;
  /** Foydalanuvchi xaritani surib to'xtatdi — markazdagi nuqta. */
  onCenter: (p: LatLng) => void;
  /** Surish boshlandi (markazdagi belgi "ko'tariladi"). */
  onMoveStart?: () => void;
  /** Ko'k nuqta (foydalanuvchining joyi) — faqat ruxsat berilgan bo'lsa. */
  showsUser: boolean;
  style?: StyleProp<ViewStyle>;
};
