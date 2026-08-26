import { useRef, useCallback, useMemo } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  description?: string;
  color?: string;
}

interface OSMMapProps {
  markers: MapMarker[];
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  onMarkerPress?: (markerId: string) => void;
  style?: any;
}

function buildHTML(markers: MapMarker[], region: OSMMapProps['region']): string {
  const markerJS = markers
    .map(
      (m) => `
    L.marker([${m.latitude}, ${m.longitude}], {
      icon: L.divIcon({
        className: 'custom-marker',
        html: '<div style="background:${m.color || '#DC2626'};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
    }).addTo(map).bindPopup('<b>${m.title}</b>${m.description ? '<br>' + m.description : ''}').on('click', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: '${m.id}' }));
    });
  `
    )
    .join('\n');

  const centerLat = region.latitude;
  const centerLng = region.longitude;
  const zoom = Math.round(Math.log2(360 / region.longitudeDelta));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .custom-marker { background: transparent; border: none; }
    .leaflet-popup-content-wrapper { border-radius: 8px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      zoomControl: false,
      attributionControl: false,
    }).setView([${centerLat}, ${centerLng}], ${zoom});

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.control.attribution({ position: 'bottomleft' })
      .addAttribution('&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>')
      .addTo(map);

    ${markerJS}

    ${markers.length > 0 ? `
      var group = L.featureGroup(map._layers ? Object.values(map._layers).filter(function(l) { return l instanceof L.Marker; }) : []);
      if (group.getLayers().length > 0) {
        map.fitBounds(group.getBounds().pad(0.3));
      }
    ` : ''}
  </script>
</body>
</html>`;
}

export function OSMMap({ markers, region, onMarkerPress, style }: OSMMapProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const webViewRef = useRef<any>(null);

  const html = useMemo(() => buildHTML(markers, region), [markers, region]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'markerPress' && onMarkerPress) {
          onMarkerPress(data.id);
        }
      } catch {}
    },
    [onMarkerPress]
  );

  return (
    <WebView
      ref={webViewRef}
      source={{ html }}
      style={[{ flex: 1 }, style]}
      onMessage={handleMessage}
      javaScriptEnabled={true}
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    />
  );
}
