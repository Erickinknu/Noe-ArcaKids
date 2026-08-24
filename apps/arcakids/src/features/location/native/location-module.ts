import { NativeModules, Platform } from 'react-native';

export interface LocationReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  triggered: boolean;
  triggeredAt?: number | null;
  childId: string;
}

export interface LocationStatus {
  isTracking: boolean;
  lastReading: LocationReading | null;
  accuracy: 'high' | 'medium' | 'low' | null;
  batteryUsage: 'low' | 'medium' | 'high';
}

interface NativeLocationModule {
  getCurrentLocation(): Promise<LocationReading>;
  startTracking(): Promise<LocationReading>;
  stopTracking(): Promise<void>;
  hasPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  addGeofence(geofence: Geofence): Promise<boolean>;
  removeGeofence(geofenceId: string): Promise<boolean>;
  getGeofences(): Promise<Geofence[]>;
  isInsideGeofence(latitude: number, longitude: number, geofence: Geofence): boolean;
  startGeofenceMonitoring(): Promise<void>;
  stopGeofenceMonitoring(): Promise<void>;
}

const native = NativeModules.ParentalLocation as
  | NativeLocationModule
  | undefined;

export const locationModule = {
  isAvailable(): boolean {
    return Platform.OS === 'android' && Boolean(native);
  },

  async hasPermission(): Promise<boolean> {
    if (!native) return false;
    return native.hasPermission();
  },

  async requestPermission(): Promise<boolean> {
    if (!native) return false;
    return native.requestPermission();
  },

  async getCurrentLocation(): Promise<LocationReading | null> {
    if (!native) return null;
    try {
      return await native.getCurrentLocation();
    } catch {
      return null;
    }
  },

  async startTracking(): Promise<LocationReading | null> {
    if (!native) return null;
    try {
      return await native.startTracking();
    } catch {
      return null;
    }
  },

  async stopTracking(): Promise<void> {
    if (!native) return;
    try {
      await native.stopTracking();
    } catch {}
  },

  async addGeofence(geofence: Geofence): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.addGeofence(geofence);
    } catch {
      return false;
    }
  },

  async removeGeofence(geofenceId: string): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.removeGeofence(geofenceId);
    } catch {
      return false;
    }
  },

  async getGeofences(): Promise<Geofence[]> {
    if (!native) return [];
    try {
      return await native.getGeofences();
    } catch {
      return [];
    }
  },

  async isInsideGeofence(latitude: number, longitude: number, geofence: Geofence): Promise<boolean> {
    if (!native) return false;
    try {
      return await native.isInsideGeofence(latitude, longitude, geofence);
    } catch {
      return false;
    }
  },

  async startGeofenceMonitoring(): Promise<void> {
    if (!native) return;
    try {
      await native.startGeofenceMonitoring();
    } catch {}
  },

  async stopGeofenceMonitoring(): Promise<void> {
    if (!native) return;
    try {
      await native.stopGeofenceMonitoring();
    } catch {}
  },
};