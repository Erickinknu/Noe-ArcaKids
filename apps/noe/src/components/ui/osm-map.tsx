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

export interface ZoneShape {
  id: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  color?: string;
}

export interface DraftZone {
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

interface OSMMapProps {
  markers?: MapMarker[];
  region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  zones?: ZoneShape[];
  draftZone?: DraftZone | null;
  onMarkerPress?: (markerId: string) => void;
  onMapPress?: (latitude: number, longitude: number) => void;
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

const SEGMENTS = 64;

function circleFeature(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  properties: Record<string, string | number>
) {
  const latRad = (latitude * Math.PI) / 180;
  const dLat = (radiusMeters / 6371000) * (180 / Math.PI);
  const dLng =
    ((radiusMeters / 6371000) * (180 / Math.PI)) / Math.max(0.01, Math.cos(latRad));
  const coords: [number, number][] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const theta = (i / SEGMENTS) * 2 * Math.PI;
    coords.push([longitude + dLng * Math.sin(theta), latitude + dLat * Math.cos(theta)]);
  }
  return {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [coords] },
    properties,
  };
}

export function buildZonesGeoJSON(zones: ZoneShape[]): string {
  const features = zones.map((z) =>
    circleFeature(z.latitude, z.longitude, z.radiusMeters, {
      id: String(z.id).replace(/[^\w-]/g, ''),
      color: z.color ?? '#2563EB',
      opacity: 0.18,
    })
  );
  return JSON.stringify({ type: 'FeatureCollection', features });
}

export function buildDraftGeoJSON(draft: DraftZone | null): string | null {
  if (!draft) return null;
  const feature = circleFeature(draft.latitude, draft.longitude, draft.radiusMeters, {
    id: 'draft',
    color: '#059669',
    opacity: 0.22,
  });
  return JSON.stringify({ type: 'FeatureCollection', features: [feature] });
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

    function ensureSource(id, layerDefs) {
      if (__map.getSource(id)) return;
      __map.addSource(id, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });
      layerDefs.forEach(function (layer) { __map.addLayer(layer); });
    }

    function updateSource(id, fc) {
      if (!__map.getSource(id)) return;
      __map.getSource(id).setData(fc);
    }
    window.updateSource = updateSource;

    __map.on('load', function () {
      ensureSource('children', [{
        id: 'children-dots',
        type: 'circle',
        source: 'children',
        paint: {
          'circle-radius': 10,
          'circle-color': ['get', 'color'],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#ffffff',
        },
      }]);
      ensureSource('zones', [
        {
          id: 'zones-fill',
          type: 'fill',
          source: 'zones',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': ['get', 'opacity'],
          },
        },
        {
          id: 'zones-outline',
          type: 'line',
          source: 'zones',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2,
          },
        },
      ]);
      ensureSource('draft', [
        {
          id: 'draft-fill',
          type: 'fill',
          source: 'draft',
          paint: {
            'fill-color': ['get', 'color'],
            'fill-opacity': ['get', 'opacity'],
          },
        },
        {
          id: 'draft-outline',
          type: 'line',
          source: 'draft',
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 2.5,
            'line-dasharray': [2, 1.5],
          },
        },
      ]);

      __map.on('click', 'children-dots', function (e) {
        var f = e.features && e.features[0];
        if (f && f.properties && f.properties.id) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', id: f.properties.id }));
        }
      });
      __map.on('click', function (e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'mapPress',
          latitude: e.lngLat.lat,
          longitude: e.lngLat.lng,
        }));
      });

      window.__mapReady = true;
    });
  </script>
</body>
</html>`;
}

export function OSMMap({
  markers = [],
  region,
  zones = [],
  draftZone,
  onMarkerPress,
  onMapPress,
  style,
}: OSMMapProps) {
  const webViewRef = useRef<any>(null);
  const readyRef = useRef(false);

  const { latitude, longitude, latitudeDelta, longitudeDelta } = region;

  const html = useMemo(
    () => buildHTML({ latitude, longitude, latitudeDelta, longitudeDelta }),
    [latitude, longitude, latitudeDelta, longitudeDelta]
  );

  const pushMarkers = useCallback((ms: MapMarker[]) => {
    if (!readyRef.current || !webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `if (window.__mapReady) window.updateSource('children', ${buildGeoJSON(ms)}); true;`
    );
  }, []);

  const pushZones = useCallback((zs: ZoneShape[]) => {
    if (!readyRef.current || !webViewRef.current) return;
    webViewRef.current.injectJavaScript(
      `if (window.__mapReady) window.updateSource('zones', ${buildZonesGeoJSON(zs)}); true;`
    );
  }, []);

  const pushDraft = useCallback((draft: DraftZone | null) => {
    if (!readyRef.current || !webViewRef.current) return;
    const fc = buildDraftGeoJSON(draft) ?? {
      type: 'FeatureCollection',
      features: [],
    };
    webViewRef.current.injectJavaScript(
      `if (window.__mapReady) window.updateSource('draft', ${JSON.stringify(fc)}); true;`
    );
  }, []);

  // Push updates live without reloading the WebView.
  useEffect(() => {
    pushMarkers(markers);
  }, [markers, pushMarkers]);

  useEffect(() => {
    pushZones(zones);
  }, [zones, pushZones]);

  useEffect(() => {
    pushDraft(draftZone ?? null);
  }, [draftZone, pushDraft]);

  const handleLoad = useCallback(() => {
    readyRef.current = true;
    pushMarkers(markers);
    pushZones(zones);
    pushDraft(draftZone ?? null);
  }, [markers, zones, draftZone, pushMarkers, pushZones, pushDraft]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);
        if (data.type === 'markerPress' && data.id && onMarkerPress) {
          onMarkerPress(data.id);
        } else if (data.type === 'mapPress' && onMapPress) {
          onMapPress(
            typeof data.latitude === 'number' ? data.latitude : parseFloat(data.latitude),
            typeof data.longitude === 'number' ? data.longitude : parseFloat(data.longitude)
          );
        }
      } catch {}
    },
    [onMarkerPress, onMapPress]
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