import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSiteSettings } from '@/services/siteService';
import { Radius } from '@/constants/layout';

export interface CheckoutMapViewProps {
  marker: { lat: number; lng: number } | null;
  onMarkerChange: (coords: { lat: number; lng: number }) => void;
  height?: number;
  style?: StyleProp<ViewStyle>;
  interactive?: boolean;
}

const DEFAULT_HUB = {
  lat: 23.2117,
  lng: 90.9634,
  label: 'Bazar Shodai Hub (Shahrasti)',
};

/**
 * Checkout Map View for Mobile.
 * Parallels the Web storefront's `MapView` component:
 * - Checks admin dashboard configuration from `/customer/settings` (`maps.provider`, `maps.googleBrowserKey`).
 * - Renders official Google Maps JavaScript API when admin selects Google and provides the browser key.
 * - Renders OpenStreetMap (Leaflet) with the admin's tile URL when OSM is selected or as an automated fallback.
 * - Supports dragging the delivery pin, tapping anywhere to set pin, and visualizes the store delivery radius.
 */
export function CheckoutMapView({
  marker,
  onMarkerChange,
  height = 240,
  style,
}: CheckoutMapViewProps) {
  const { data: settings, isLoading } = useSiteSettings();
  const webViewRef = useRef<any>(null);
  const [googleFailed, setGoogleFailed] = useState(false);

  const mapsConfig = settings?.maps;
  const deliveryConfig = settings?.delivery;

  const origin = deliveryConfig?.origin || DEFAULT_HUB;
  const serviceRadiusKm = deliveryConfig?.serviceRadiusKm || 10;
  const googleBrowserKey = mapsConfig?.googleBrowserKey?.trim();
  const provider = mapsConfig?.provider || 'osm';

  // Determine whether to use Google or OpenStreetMap based on admin settings
  const wantsGoogle = provider === 'google' && Boolean(googleBrowserKey);
  const useGoogle = wantsGoogle && !googleFailed;
  const osmTileUrl = mapsConfig?.osmTileUrl || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'PIN_CHANGED' && typeof data.lat === 'number' && typeof data.lng === 'number') {
        onMarkerChange({ lat: data.lat, lng: data.lng });
      } else if (data.type === 'MAP_ERROR') {
        if (useGoogle) {
          setGoogleFailed(true);
        }
      }
    } catch {
      // Ignore malformed message
    }
  };

  // Sync external pin updates (e.g. from GPS button) into the webview map
  useEffect(() => {
    if (marker && webViewRef.current) {
      const js = `if (window.updatePin) { window.updatePin(${marker.lat}, ${marker.lng}); } true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [marker?.lat, marker?.lng]);

  const originLat = origin.lat;
  const originLng = origin.lng;
  const initialLat = marker ? marker.lat : originLat;
  const initialLng = marker ? marker.lng : originLng;
  const radiusMeters = serviceRadiusKm * 1000;

  // Google Maps HTML template
  const googleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>
          html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #eef2eb; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          let map, marker, radiusCircle, originMarker;
          const origin = { lat: ${originLat}, lng: ${originLng} };
          const initialPos = { lat: ${initialLat}, lng: ${initialLng} };
          const hasMarker = ${Boolean(marker)};

          function post(type, data) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, ...data }));
            }
          }

          function initGoogleMap() {
            map = new google.maps.Map(document.getElementById('map'), {
              center: initialPos,
              zoom: 14,
              disableDefaultUI: true,
              zoomControl: true,
              gestureHandling: 'greedy'
            });

            // Shop Hub
            originMarker = new google.maps.Marker({
              position: origin,
              map: map,
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: '#0b6234',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 2,
              },
              title: '${origin.label || 'Bazar Shodai'}'
            });

            // Delivery Service Radius
            radiusCircle = new google.maps.Circle({
              strokeColor: '#45a22c',
              strokeOpacity: 0.85,
              strokeWeight: 2,
              fillColor: '#45a22c',
              fillOpacity: 0.08,
              map: map,
              center: origin,
              radius: ${radiusMeters},
              clickable: false
            });

            if (hasMarker) {
              setDeliveryMarker(initialPos);
            }

            map.addListener('click', function(e) {
              const lat = e.latLng.lat();
              const lng = e.latLng.lng();
              setDeliveryMarker({ lat: lat, lng: lng });
              post('PIN_CHANGED', { lat: lat, lng: lng });
            });
          }

          function setDeliveryMarker(pos) {
            if (!marker) {
              marker = new google.maps.Marker({
                position: pos,
                map: map,
                draggable: true,
                animation: google.maps.Animation.DROP
              });
              marker.addListener('dragend', function() {
                const p = marker.getPosition();
                post('PIN_CHANGED', { lat: p.lat(), lng: p.lng() });
              });
            } else {
              marker.setPosition(pos);
            }
          }

          window.updatePin = function(lat, lng) {
            const pos = { lat: lat, lng: lng };
            if (map) {
              map.panTo(pos);
              setDeliveryMarker(pos);
            }
          };

          window.gm_authFailure = function() {
            post('MAP_ERROR', { error: 'AuthFailure' });
          };
        </script>
        <script src="https://maps.googleapis.com/maps/api/js?key=${googleBrowserKey}&callback=initGoogleMap" async defer onerror="post('MAP_ERROR', { error: 'NetworkError' })"></script>
      </body>
    </html>
  `;

  // OpenStreetMap (Leaflet) HTML template
  const osmHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #eef2eb; }
          .leaflet-control-attribution { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          function post(type, data) {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, ...data }));
            }
          }

          const origin = { lat: ${originLat}, lng: ${originLng} };
          const initialPos = { lat: ${initialLat}, lng: ${initialLng} };
          const hasMarker = ${Boolean(marker)};
          const tileUrl = '${osmTileUrl}';

          const map = L.map('map', { zoomControl: true }).setView([initialPos.lat, initialPos.lng], 14);

          L.tileLayer(tileUrl, { maxZoom: 19 }).addTo(map);

          // Hub Marker
          L.circleMarker([origin.lat, origin.lng], {
            radius: 8,
            fillColor: '#0b6234',
            color: '#ffffff',
            weight: 2,
            opacity: 1,
            fillOpacity: 1
          }).addTo(map);

          // Delivery Radius
          L.circle([origin.lat, origin.lng], {
            color: '#45a22c',
            weight: 2,
            fillColor: '#45a22c',
            fillOpacity: 0.08,
            radius: ${radiusMeters},
            interactive: false
          }).addTo(map);

          let pinMarker = null;

          function setPin(lat, lng) {
            if (!pinMarker) {
              pinMarker = L.marker([lat, lng], { draggable: true }).addTo(map);
              pinMarker.on('dragend', function(e) {
                const ll = e.target.getLatLng();
                post('PIN_CHANGED', { lat: ll.lat, lng: ll.lng });
              });
            } else {
              pinMarker.setLatLng([lat, lng]);
            }
          }

          if (hasMarker) {
            setPin(initialPos.lat, initialPos.lng);
          }

          map.on('click', function(e) {
            setPin(e.latlng.lat, e.latlng.lng);
            post('PIN_CHANGED', { lat: e.latlng.lat, lng: e.latlng.lng });
          });

          window.updatePin = function(lat, lng) {
            map.setView([lat, lng], 15);
            setPin(lat, lng);
          };
        </script>
      </body>
    </html>
  `;

  if (isLoading) {
    return (
      <View style={[styles.loadingBox, { height }, style]}>
        <ActivityIndicator size="small" color="#0b6234" />
        <Text style={styles.loadingText}>ম্যাপ লোড হচ্ছে...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.mapContainer, { height }, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: useGoogle ? googleHtml : osmHtml }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        style={styles.webview}
      />
      <View style={styles.providerBadge}>
        <Text style={styles.providerText}>
          {useGoogle ? 'Google Maps' : 'OpenStreetMap'} • ড্যাশবোর্ড সেটিংস
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    width: '100%',
    borderRadius: Radius.brand,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#eef2eb',
    position: 'relative',
  },
  webview: {
    flex: 1,
    backgroundColor: '#eef2eb',
  },
  loadingBox: {
    width: '100%',
    borderRadius: Radius.brand,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  providerBadge: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  providerText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#0b6234',
  },
});
