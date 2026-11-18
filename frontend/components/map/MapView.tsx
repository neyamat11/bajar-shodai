"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import type { MapViewProps } from "./types";

const Loading = ({ className }: { className?: string }) => <div className={`animate-pulse rounded bg-secondary ${className ?? ""}`} aria-busy="true" />;

// The map code (and its stylesheet) is only downloaded when a map is actually shown, so browsing the shop never loads it.
const OsmMap = dynamic(() => import("./OsmMap"), { ssr: false, loading: () => <Loading className="h-full min-h-64 w-full" /> });
const GoogleMapView = dynamic(() => import("./GoogleMapView"), { ssr: false, loading: () => <Loading className="h-full min-h-64 w-full" /> });

/**
 * One map for the whole site. It draws with Google when the admin chose Google and added the browser key,
 * and with OpenStreetMap otherwise, so a missing key or auth error never leaves an empty box or broken modal.
 */
export default function MapView(props: MapViewProps) {
  const [googleFailed, setGoogleFailed] = useState(false);
  const isDirectMode = (props.config.distanceCalculation ?? "direct") === "direct";
  const wantsGoogle = (isDirectMode || props.config.provider === "google") && !!props.config.googleBrowserKey;
  // In direct distance mode: strictly use Google Maps (never fallback to OpenStreetMap)
  // In road distance mode: use the active provider selected by admin (default OSM, or Google)
  const useGoogle = isDirectMode
    ? Boolean(props.config.googleBrowserKey)
    : wantsGoogle && !googleFailed;

  return useGoogle ? (
    <GoogleMapView
      {...props}
      onAuthError={() => {
        if (!isDirectMode) {
          setGoogleFailed(true);
        }
        props.onAuthError?.();
      }}
    />
  ) : (
    <OsmMap {...props} />
  );
}
