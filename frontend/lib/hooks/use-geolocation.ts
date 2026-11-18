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
// Mobile-resilient timeouts: 15s for high accuracy satellite/fused, 10s for low-accuracy network fallback
const HIGH_ACCURACY_TIMEOUT_MS = 15000;
const LOW_ACCURACY_TIMEOUT_MS = 10000;

/**
 * Fast & resilient geolocation engine for mobile and desktop web browsers.
 * Leverages OS Fused Location Provider (Google Play Services / GNSS) with smart caching:
 * - Accepts recent (<30s) fixes instantly without cold-start GPS satellite lock delay.
 * - Accurately differentiates between browser site permission blocks vs. device GPS turned off.
 * - Provides graceful network/cellular fallback before declaring a timeout.
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

    return new Promise(async (resolve) => {
      let resolved = false;

      // Check whether site permission was explicitly denied in browser settings
      let isPermissionExplicitlyDenied = false;
      if (typeof navigator !== "undefined" && navigator.permissions?.query) {
        try {
          const perm = await navigator.permissions.query({ name: "geolocation" as PermissionName });
          isPermissionExplicitlyDenied = perm.state === "denied";
        } catch {
          // ignore
        }
      }

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

      // 1. Primary: High-accuracy query via OS Fused Location Provider (Google Play Services / GPS)
      // maximumAge: 30000 allows immediate sub-second fix if the device already has a recent location
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
          // If browser site permission is explicitly denied in browser settings, don't attempt fallback
          if (primaryErr.code === primaryErr.PERMISSION_DENIED && isPermissionExplicitlyDenied) {
            return finish(null, "denied");
          }

          // 2. Fallback: If satellite GPS is taking time or indoor, attempt network-based position (cellular / Wi-Fi)
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
              if (code === primaryErr.PERMISSION_DENIED) {
                // If site permission is denied in browser, show "denied".
                // Otherwise phone's GPS / Location service is turned off, so show "unavailable"
                finish(null, isPermissionExplicitlyDenied ? "denied" : "unavailable");
              } else if (code === primaryErr.TIMEOUT) {
                finish(null, "timeout");
              } else {
                finish(null, "unavailable");
              }
            },
            {
              enableHighAccuracy: false,
              timeout: LOW_ACCURACY_TIMEOUT_MS,
              maximumAge: 180000, // 3 minutes cached fix
            },
          );
        },
        {
          enableHighAccuracy: true,
          timeout: HIGH_ACCURACY_TIMEOUT_MS,
          maximumAge: 30000, // Accepts fresh fused fix from last 30s
        },
      );
    });
  }, []);

  const cancel = useCallback(() => {
    setLoading(false);
  }, []);

  return { fix, loading, error, locate, cancel };
}
