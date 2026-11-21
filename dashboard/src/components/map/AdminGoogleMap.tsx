import { AdvancedMarker, APIProvider, Map, useMap } from "@vis.gl/react-google-maps";
import { useEffect, useRef } from "react";
import type { MapViewProps } from "./types";

/** Circles and road polyline drawn on the Google Map */
function Overlays(p: MapViewProps) {
  const map = useMap();
  const shapes = useRef<{ accuracy?: google.maps.Circle; radius?: google.maps.Circle; route?: google.maps.Polyline }>({});

  useEffect(() => {
    if (!map) return;
    const s = shapes.current;
    if (p.marker && p.accuracyM && p.accuracyM > 0) {
      const opts = { center: p.marker, radius: p.accuracyM, strokeColor: "#1e88b5", strokeWeight: 1, fillColor: "#1e88b5", fillOpacity: 0.12, clickable: false };
      if (!s.accuracy) s.accuracy = new google.maps.Circle({ ...opts, map });
      else s.accuracy.setOptions(opts);
    } else {
      s.accuracy?.setMap(null);
      s.accuracy = undefined;
    }
    const centre = p.radiusCenter ?? p.origin;
    if (p.radiusKm && centre) {
      const opts = { center: centre, radius: p.radiusKm * 1000, strokeColor: "#45a22c", strokeWeight: 2, strokeOpacity: 0.9, fillColor: "#45a22c", fillOpacity: 0.05, clickable: false };
      if (!s.radius) s.radius = new google.maps.Circle({ ...opts, map });
      else s.radius.setOptions(opts);
    } else {
      s.radius?.setMap(null);
      s.radius = undefined;
    }
    s.route?.setMap(null);
    s.route = undefined;
    if (p.route && p.route.length > 1) {
      s.route = new google.maps.Polyline({ path: p.route, strokeColor: "#0b6234", strokeWeight: 5, strokeOpacity: 0.85, map });
    }
  }, [map, p.marker, p.accuracyM, p.radiusKm, p.radiusCenter, p.origin, p.route]);

  // show the pin and the shop together
  useEffect(() => {
    if (!map) return;
    const pts = [p.marker, p.origin && (p.marker || p.route?.length) ? p.origin : null].filter(Boolean) as { lat: number; lng: number }[];
    if (pts.length > 1) {
      const b = new google.maps.LatLngBounds();
      pts.forEach((q) => b.extend(q));
      map.fitBounds(b, 48);
    } else if (pts.length === 1) {
      map.panTo(pts[0]);
      if ((map.getZoom() ?? 0) < (p.zoom ?? 15)) map.setZoom(p.zoom ?? 15);
    } else {
      map.setCenter(p.center);
      map.setZoom(p.zoom ?? 15);
    }
  }, [map, p.fitKey]);

  return null;
}

export default function AdminGoogleMap(p: MapViewProps) {
  const key = p.googleBrowserKey ?? "";
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dismissGoogleError = () => {
      // 1. Auto-click OK button inside Google Maps development/billing modal if rendered
      const buttons = document.querySelectorAll<HTMLButtonElement>(".gm-err-content button, .gm-err-container button");
      buttons.forEach((btn) => {
        try {
          btn.click();
        } catch {}
      });

      // 2. Hide and remove known Google error containers
      const errEls = document.querySelectorAll<HTMLElement>(".gm-err-container, .gm-err-content, .gm-err-autocomplete, .gm-style-moc");
      errEls.forEach((el) => {
        el.style.display = "none";
        el.remove();
      });

      // 3. Fallback scan for any dialog div containing the error message text
      const allDivs = document.querySelectorAll<HTMLElement>("body div");
      allDivs.forEach((d) => {
        const text = d.innerText;
        if (text && text.indexOf("This page can't load Google Maps correctly") !== -1) {
          d.style.display = "none";
          d.remove();
        }
      });
    };

    // Run immediate pass
    dismissGoogleError();

    // Hook window.gm_authFailure
    const prevAuthFailure = (window as unknown as { gm_authFailure?: () => void }).gm_authFailure;
    (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = () => {
      dismissGoogleError();
      p.onAuthError?.();
      if (typeof prevAuthFailure === "function") prevAuthFailure();
    };

    // Watch for Google Maps dynamically appending modal dialogs into the DOM
    const observer = new MutationObserver(() => {
      dismissGoogleError();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const checkInterval = setInterval(dismissGoogleError, 200);
    const timeout = setTimeout(() => clearInterval(checkInterval), 6000);

    return () => {
      observer.disconnect();
      clearInterval(checkInterval);
      clearTimeout(timeout);
      (window as unknown as { gm_authFailure?: () => void }).gm_authFailure = prevAuthFailure;
    };
  }, [p.onAuthError]);

  return (
    <APIProvider apiKey={key} onError={() => p.onAuthError?.()}>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .gm-err-container,
            .gm-err-content,
            .gm-err-autocomplete,
            .gm-style-moc {
              display: none !important;
              visibility: hidden !important;
              opacity: 0 !important;
              pointer-events: none !important;
            }
          `,
        }}
      />
      <div
        ref={containerRef}
        className={`relative z-0 ${p.className ?? ""}`}
        role="application"
        aria-label={p.ariaLabel}
      >
        <Map
          mapId="DEMO_MAP_ID"
          defaultCenter={p.center}
          defaultZoom={p.zoom ?? 15}
          mapTypeId={p.satellite ? "hybrid" : "roadmap"}
          gestureHandling="greedy"
          disableDefaultUI={false}
          zoomControl={true}
          mapTypeControl={true}
          streetViewControl={true}
          fullscreenControl={false}
          style={{ width: "100%", height: "100%" }}
          onClick={(e) => {
            const ll = e.detail.latLng;
            if (p.draggable && ll) p.onMarkerChange?.({ lat: ll.lat, lng: ll.lng });
          }}
        >
          {p.marker && (
            <AdvancedMarker
              position={p.marker}
              draggable={!!p.draggable}
              onDragEnd={(e) => {
                const ll = e.latLng;
                if (ll) p.onMarkerChange?.({ lat: ll.lat(), lng: ll.lng() });
              }}
            />
          )}
          {p.origin && (
            <AdvancedMarker position={p.origin} title={p.originLabel}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#0b6234", border: "3px solid #fff", boxShadow: "0 2px 6px rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l1-5h16l1 5M4 9v11h16V9M9 20v-6h6v6" />
                </svg>
              </div>
            </AdvancedMarker>
          )}
          <Overlays {...p} />
        </Map>
      </div>
    </APIProvider>
  );
}
