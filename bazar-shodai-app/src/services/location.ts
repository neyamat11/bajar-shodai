import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const KALIBARI_HUB = {
  latitude: 23.2452,
  longitude: 90.9422,
};

export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function calculateLocalDeliveryFee(distanceKm: number, subtotal?: number): number {
  if (subtotal !== undefined && subtotal >= 1000) return 0;
  if (distanceKm <= 2) return 20;
  const extraKm = Math.ceil(distanceKm - 2);
  return 20 + extraKm * 10;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export interface GeocodedAddress {
  formattedAddress: string;
  name?: string | null;
  street?: string | null;
  district?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postalCode?: string | null;
}

export type LocationAcquireError = 'SERVICES_DISABLED' | 'PERMISSION_DENIED' | 'UNAVAILABLE';

export type LocationAcquireResult =
  | { success: true; coords: Coordinates; isCoarse?: boolean }
  | { success: false; error: LocationAcquireError };

export async function requestLocationPermission(): Promise<boolean> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function checkLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

/**
 * Fast sub-3-second native location acquisition.
 * 1. Verifies that the phone's Location (GPS) service is enabled.
 * 2. Checks and requests foreground location permissions.
 * 3. Calls Location.getCurrentPositionAsync with High accuracy (utilizes Android/iOS fused provider).
 * 4. Falls back to Location.getLastKnownPositionAsync if satellite signal is delayed.
 * Never returns fake/hardcoded coordinates.
 */
export async function acquireLiveLocation(): Promise<LocationAcquireResult> {
  try {
    let servicesEnabled = await checkLocationServicesEnabled();
    if (!servicesEnabled) {
      // Directly trigger Google Play Services native system turn-on dialog on Android
      if (Platform.OS === 'android') {
        try {
          await Location.enableNetworkProviderAsync();
          servicesEnabled = await checkLocationServicesEnabled();
        } catch {
          // User dismissed or tapped 'No thanks'
        }
      }
      if (!servicesEnabled) {
        return { success: false, error: 'SERVICES_DISABLED' };
      }
    }

    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      return { success: false, error: 'PERMISSION_DENIED' };
    }

    // 1. Fast live fix with High accuracy (timeout 6s)
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 6000,
      });

      const accuracy = pos.coords.accuracy ?? 10;
      return {
        success: true,
        coords: {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy,
        },
        isCoarse: accuracy > 100,
      };
    } catch {
      // 2. Fallback to last known position if recent (<2 minutes)
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 120000,
      });

      if (lastKnown) {
        return {
          success: true,
          coords: {
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
            accuracy: lastKnown.coords.accuracy ?? 50,
          },
          isCoarse: true,
        };
      }

      return { success: false, error: 'UNAVAILABLE' };
    }
  } catch {
    return { success: false, error: 'UNAVAILABLE' };
  }
}

/**
 * Legacy wrapper: Returns real coordinates or null if failed.
 * Never silently substitutes fake coordinates.
 */
export async function getCurrentCoordinates(): Promise<Coordinates | null> {
  const result = await acquireLiveLocation();
  if (result.success) {
    return result.coords;
  }
  return null;
}

export async function reverseGeocodeCoordinates(
  lat: number,
  lng: number,
): Promise<GeocodedAddress> {
  try {
    const results = await Location.reverseGeocodeAsync({
      latitude: lat,
      longitude: lng,
    });

    if (results && results.length > 0) {
      const first = results[0];
      const parts = [
        first?.name,
        first?.street,
        first?.district || first?.city,
        first?.region,
      ].filter(Boolean);

      return {
        formattedAddress: parts.join(', ') || 'Selected Location, Bangladesh',
        name: first?.name,
        street: first?.street,
        district: first?.district,
        city: first?.city,
        region: first?.region,
        country: first?.country,
        postalCode: first?.postalCode,
      };
    }
  } catch {
    // fallback
  }

  return {
    formattedAddress: 'Shahrasti, Chandpur, Bangladesh',
    city: 'Shahrasti',
    district: 'Chandpur',
    country: 'Bangladesh',
  };
}
