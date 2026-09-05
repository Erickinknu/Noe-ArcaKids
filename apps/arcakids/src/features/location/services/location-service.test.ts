import { LocationService } from './location-service';
import { storage } from '@noe-arcakids/storage';
import type { Geofence } from '@noe-arcakids/types';

jest.mock('@noe-arcakids/supabase', () => ({
  requireSupabaseClient: jest.fn(() => ({
    rpc: jest.fn(async () => ({ data: null, error: null })),
  })),
}));

jest.mock('@/features/location/native/location-module', () => ({
  locationModule: {
    hasPermission: jest.fn(async () => true),
    requestPermission: jest.fn(async () => true),
    getCurrentLocation: jest.fn(async () => null),
  },
}));

jest.mock('@/features/identity/services/identity-service', () => ({
  identityService: {
    getLocalDevice: jest.fn(async () => ({ deviceUuid: 'device-1' })),
    getChildInfo: jest.fn(async () => ({ childId: 'child-1' })),
  },
}));

jest.mock('@/features/notifications', () => ({
  notificationService: {
    scheduleGeofenceEnterNotification: jest.fn(async () => {}),
  },
}));

jest.mock('@/features/parental/services/parental-service', () => ({
  parentalService: {
    reportLocation: jest.fn(async () => {}),
  },
}));

jest.mock('@/features/location/repositories/geofence-repository', () => ({
  geofenceRepository: {
    getAll: jest.fn(async () => []),
    update: jest.fn(async () => {}),
  },
}));

jest.mock('@noe-arcakids/storage', () => ({
  storage: {
    get: jest.fn(async () => null),
    save: jest.fn(async () => {}),
    remove: jest.fn(async () => {}),
    clear: jest.fn(async () => {}),
  },
}));

const mockedStorageGet = jest.mocked(storage.get);
const mockedStorageSave = jest.mocked(storage.save);

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocationService();
  });

  afterEach(() => {
    service.stopLocationMonitoring();
  });

  it('starts with tracking disabled and no reading', () => {
    const state = service.getState();
    expect(state.isTracking).toBe(false);
    expect(state.lastReading).toBeNull();
    expect(state.geofences).toEqual([]);
  });

  it('rehydrates cached geofences from storage after construction', async () => {
    const geofences: Geofence[] = [
      {
        id: 'geo-1',
        familyId: 'family-1',
        childId: 'child-1',
        name: 'Casa',
        latitude: 19.4326,
        longitude: -99.1332,
        radius: 200,
        enabled: true,
        createdAt: '2026-09-01T00:00:00Z',
        triggered: false,
      },
    ];
    mockedStorageGet.mockImplementationOnce(async (key: string) => {
      if (key === 'location/geofences') return JSON.stringify(geofences);
      return null;
    });
    service = new LocationService();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(service.geofences).toEqual(geofences);
  });

  it('updateGeofences replaces the list and persists it', async () => {
    const geofences: Geofence[] = [
      {
        id: 'geo-2',
        familyId: 'family-1',
        childId: 'child-1',
        name: 'Escuela',
        latitude: 19.45,
        longitude: -99.2,
        radius: 100,
        enabled: true,
        createdAt: '2026-09-02T00:00:00Z',
        triggered: false,
      },
    ];

    service.updateGeofences(geofences);

    expect(service.geofences).toEqual(geofences);
    expect(mockedStorageSave).toHaveBeenCalledWith(
      'location/geofences',
      JSON.stringify(geofences)
    );
  });

  it('startLocationMonitoring enables tracking and stop disables it', () => {
    service.startLocationMonitoring();
    expect(service.getState().isTracking).toBe(true);

    service.stopLocationMonitoring();
    expect(service.getState().isTracking).toBe(false);
  });
});