import { NativeModules, Platform } from 'react-native';

export interface LocationReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
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
  hasBackgroundPermission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  requestBackgroundPermission(): Promise<boolean>;
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

  async hasBackgroundPermission(): Promise<boolean> {
    if (!native) return false;
    return native.hasBackgroundPermission();
  },

  async requestPermission(): Promise<boolean> {
    if (!native) return false;
    return native.requestPermission();
  },

  async requestBackgroundPermission(): Promise<boolean> {
    if (!native) return false;
    return native.requestBackgroundPermission();
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
};
