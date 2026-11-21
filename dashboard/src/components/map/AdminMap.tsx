import { Component, lazy, Suspense, useState, type ReactNode } from "react";
import type { MapViewProps } from "./types";

const AdminOsmMap = lazy(() => import("./AdminOsmMap"));
const AdminGoogleMap = lazy(() => import("./AdminGoogleMap"));

class MapErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err: unknown) {
    console.warn("Google Map failed, falling back to OpenStreetMap:", err);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * Unified Admin Map.
 * Renders Google Maps when googleBrowserKey is available and Google Maps is active,
 * falling back seamlessly to OpenStreetMap (Leaflet) if unconfigured or on auth error.
 */
export default function AdminMap(props: MapViewProps) {
  const [googleFailed, setGoogleFailed] = useState(false);
  const wantsGoogle = (props.provider === "google" || !props.provider) && !!props.googleBrowserKey;
  const useGoogle = wantsGoogle && !googleFailed;

  return (
    <Suspense fallback={<div className="h-full w-full min-h-[200px] animate-pulse bg-muted" />}>
      {useGoogle ? (
        <MapErrorBoundary fallback={<AdminOsmMap {...props} />}>
          <AdminGoogleMap
            {...props}
            onAuthError={() => {
              setGoogleFailed(true);
              props.onAuthError?.();
            }}
          />
        </MapErrorBoundary>
      ) : (
        <AdminOsmMap {...props} />
      )}
    </Suspense>
  );
}
