import { useRef, useCallback, useMemo, useEffect } from 'react';
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

function esc(value: unknown): string {
  return String(value ?? '').replace(/</g, '\\u003c');
}

function buildGeoJSON(markers: MapMarker[]): string {
  const features = markers.map((m) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [m.longitude, m.latitude] },
    properties: {
      id: String(m.id).replace(/[^\w-]/g, ''),
      title: esc(m.title),
      description: esc(m.description ?? ''),
      color: m.color ?? '#DC2626',
    },
  }));
  return JSON.stringify({ type: 'FeatureCollection', features });
}

function buildHTML(region: OSMMapProps['region']): string {
  const centerLat = region.latitude;
  const centerLng = region.longitude;
  const zoom = Math.round(Math.log2(360 / region.longitudeDelta)) + 1;
  const safeZoom = Math.max(1, Math.min(19, zoom));

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link href="https://unpkg.com/maplibre-gl@5.3.0/dist/maplibre-gl.css" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .maplibregl-popup-content { border-radius: 8px; font-family: system-ui, sans-serif; }
    .maplibregl-ctrl-attrib { font-size: 9px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/maplibre-gl@5.3.0/dist/maplibre-gl.js"></script>
  <script>
    window.__mapReady = false;

    var __map = new maplibregl.Map({
      container: 'map',
      style: {
        version: 8,
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '&copy; OpenStreetMap',
          },
        },
        layers: [
          { id: 'osm', type: 'raster', source: 'osm' },
        ],
      },
      center: [${centerLng}, ${centerLat}],
      zoom: ${safeZoom},
      attributionControl: false,
    });

    __map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    __map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');

    function updateLocationMarkers(fc) {
      if (!__map.getSource('children')) return;
      __map.getSource('children').setData(fc);
    }
    window.updateLocationMarkers = updateLocationMarkers;

    __map.on('load', function () {
      if (!__map.getSource('children')) {
        __map.addSource('children', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
        __map.addLayer({
          id: 'children-dots',
          type: 'circle',
          source: 'children',
          paint: {
            'circle-radius': 10,
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 3,
            'circle-stroke-color': '#ffffff',
          },
        });
        __map.on('click', 'children-dots', function (e) {
          var f = e.features && e.features[0];
          if (f && f.properties && f.properties.id) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: f.properties.id }));
          }
        });
      }
      window.__mapReady = true;
    });
  </script>
</body>
</html>`;
}

export function OSMMap({ markers, region, onMarkerPress, style }: OSMMapProps) {
  const webViewRef = useRef<any>(null);
  const readyRef = useRef(false);

  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

  const html = useMemo(
    () => buildHTML({ latitude, longitude, latitudeDelta, longitudeDelta }),
    [latitude, longitude, latitudeDelta, longitudeDelta]
  );

  const pushMarkers = useCallback(
    (ms: MapMarker[]) => {
      if (!readyRef.current || !webViewRef.current) return;
      const fc = buildGeoJSON(ms);
      webViewRef.current.injectJavaScript(
        `if (window.__mapReady) window.updateLocationMarkers(${fc}); true;`
      );
    },
    []
  );

  // Push marker updates live without reloading the WebView.
  useEffect(() => {
    pushMarkers(markers);
  }, [markers, pushMarkers]);

  const handleLoad = useCallback(() => {
    readyRef.current = true;
    pushMarkers(markers);
  }, [markers, pushMarkers]);

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
      onLoad={handleLoad}
      javaScriptEnabled={true}
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
    />
  );
}