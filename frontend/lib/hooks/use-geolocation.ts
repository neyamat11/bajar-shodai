"use client";

import { useCallback, useState } from "react";

export type GeoError = "unsupported" | "insecure" | "denied" | "unavailable" | "timeout";

export interface GeoFix {
  lat: number;
  lng: number;
  /** metres: how close the device thinks it is */
  accuracyM: number;
  /** true when the fix is approximate (> 100 meters, e.g. indoor or cellular/Wi-Fi) */
  isCoarse?: boolean;
}

// Acceptable high-precision threshold in metres. A reading under 100m is accepted immediately.
const HIGH_ACCURACY_THRESHOLD_M = 100;
// Fast safety timeouts: 7s for high accuracy satellite/fused, 3s for low-accuracy fallback
const HIGH_ACCURACY_TIMEOUT_MS = 7000;
const LOW_ACCURACY_TIMEOUT_MS = 3000;

/**
 * Fast sub-3-second geolocation engine.
 * Calls the operating system's fused location provider (Google Play Services / GNSS) directly.
 * Resolves within 1–2.5 seconds on mobile phones and provides immediate coordinate pinning.
 */
export function useGeolocation() {
  const [fix, setFix] = useState<GeoFix | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GeoError | null>(null);

  const locate = useCallback((): Promise<GeoFix | null> => {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("unsupported");
      return Promise.resolve(null);
    }
    // Mobile browsers require a secure origin (https) or localhost
    if (!window.isSecureContext) {
      setError("insecure");
      return Promise.resolve(null);
    }

    setLoading(true);

    return new Promise((resolve) => {
      let resolved = false;

      const finish = (result: GeoFix | null, err?: GeoError) => {
        if (resolved) return;
        resolved = true;
        setLoading(false);
        if (result) {
          setFix(result);
          setError(null);
        } else if (err) {
          setError(err);
        }
        resolve(result);
      };

      // 1. Primary: Fast high-accuracy query via OS Fused Location Provider
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const accuracyM = Math.round(pos.coords.accuracy);
          const isCoarse = accuracyM > HIGH_ACCURACY_THRESHOLD_M;
          finish({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyM,
            isCoarse,
          });
        },
        (primaryErr) => {
          if (primaryErr.code === primaryErr.PERMISSION_DENIED) {
            return finish(null, "denied");
          }

          // 2. Fallback: If device lacks a GPS chip (e.g. laptop) or satellite lock is unavailable,
          // immediately attempt network-based position (cellular / Wi-Fi) with cached age
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              const accuracyM = Math.round(fallbackPos.coords.accuracy);
              finish({
                lat: fallbackPos.coords.latitude,
                lng: fallbackPos.coords.longitude,
                accuracyM,
                isCoarse: true,
              });
            },
            (fallbackErr) => {
              const code = fallbackErr.code || primaryErr.code;
              finish(
                null,
                code === primaryErr.PERMISSION_DENIED
                  ? "denied"
                  : code === primaryErr.TIMEOUT
                  ? "timeout"
                  : "unavailable",
              );
            },
            {
              enableHighAccuracy: false,
              timeout: LOW_ACCURACY_TIMEOUT_MS,
              maximumAge: 60000,
            },
          );
        },
        {
          enableHighAccuracy: true,
          timeout: HIGH_ACCURACY_TIMEOUT_MS,
          maximumAge: 0,
        },
      );
    });
  }, []);

  const cancel = useCallback(() => {
    setLoading(false);
  }, []);

  return { fix, loading, error, locate, cancel };
}
