import { useEffect, useRef } from 'react';
import MapView from 'react-native-maps';

import { colors } from '../../theme/tokens';
import type { AddressMapProps } from './AddressMap.types';

/** Ko'cha va uylar ko'rinadigan masshtab. */
const DELTA = 0.006;

/**
 * Manzil tanlash xaritasi: iPhone'da Apple xaritasi, Android'da Google xaritasi (Expo Go'da sozlashsiz ishlaydi).
 * Belgi xaritaning markazida turadi, foydalanuvchi xaritani suradi — kichik ekranda ham aniq va qulay.
 */
export function AddressMap({ initial, focus, onCenter, onMoveStart, showsUser, style }: AddressMapProps) {
  const ref = useRef<MapView>(null);
  useEffect(() => {
    if (focus) ref.current?.animateToRegion({ latitude: focus.point.lat, longitude: focus.point.lng, latitudeDelta: DELTA, longitudeDelta: DELTA }, 450);
  }, [focus]);
  return (
    <MapView
      ref={ref}
      style={style}
      initialRegion={{ latitude: initial.lat, longitude: initial.lng, latitudeDelta: DELTA, longitudeDelta: DELTA }}
      onRegionChangeStart={() => onMoveStart?.()}
      onRegionChangeComplete={(r) => onCenter({ lat: r.latitude, lng: r.longitude })}
      showsUserLocation={showsUser}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      userInterfaceStyle="light"
      loadingEnabled
      loadingIndicatorColor={colors.primary}
      loadingBackgroundColor={colors.bg}
    />
  );
}
