import { circleFeature, estimateMaxRadiusKm } from './zone-geometry';

describe('circleFeature', () => {
  it('builds a polygon with 64 vertices centered on the given point', () => {
    const feature = circleFeature(-12.0464, -77.0428, 500, { id: 'z1', color: '#000' });
    const ring = feature.geometry.coordinates[0] as [number, number][];
    expect(ring).toHaveLength(64);

    let sumLat = 0;
    let sumLng = 0;
    for (const [lng, lat] of ring) {
      sumLat += lat;
      sumLng += lng;
    }
    expect(sumLat / 64).toBeCloseTo(-12.0464, 4);
    expect(sumLng / 64).toBeCloseTo(-77.0428, 4);
  });

  it('scales the ring with radius', () => {
    const small = circleFeature(0, 0, 250, {});
    const large = circleFeature(0, 0, 1000, {});
    const smallRing = small.geometry.coordinates[0] as [number, number][];
    const largeRing = large.geometry.coordinates[0] as [number, number][];
    const extent = (ring: [number, number][]) => {
      const lats = ring.map(([, lat]) => lat);
      const lngs = ring.map(([lng]) => lng);
      return Math.max(Math.max(...lats) - Math.min(...lats), Math.max(...lngs) - Math.min(...lngs));
    };
    expect(extent(largeRing)).toBeGreaterThan(extent(smallRing));
  });

  it('has valid GeoJSON geometry', () => {
    expect(circleFeature(10, 10, 100, {}).geometry.type).toBe('Polygon');
  });
});

describe('estimateMaxRadiusKm', () => {
  it('returns a box half-width scaled with the radius', () => {
    expect(estimateMaxRadiusKm(0, 0, 1000)).toBeCloseTo(1, 1);
    expect(estimateMaxRadiusKm(0, 0, 2000)).toBeCloseTo(2, 1);
  });

  it('is positive for any valid coordinates', () => {
    expect(estimateMaxRadiusKm(90, 180, 5000)).toBeGreaterThan(0);
  });
});