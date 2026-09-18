const SEGMENTS = 64;

export interface CircleFeature {
  type: 'Feature';
  geometry: { type: 'Polygon'; coordinates: [number, number][][] };
  properties: Record<string, string | number>;
}

export function circleFeature(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  properties: Record<string, string | number>
): CircleFeature {
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

export function estimateMaxRadiusKm(
  latitude: number,
  longitude: number,
  radiusMeters: number
): number {
  const latRad = (latitude * Math.PI) / 180;
  const dLat = (radiusMeters / 6371000) * (180 / Math.PI);
  const dLng =
    ((radiusMeters / 6371000) * (180 / Math.PI)) / Math.max(0.01, Math.cos(latRad));
  return Math.max(dLat, dLng) * 111;
}