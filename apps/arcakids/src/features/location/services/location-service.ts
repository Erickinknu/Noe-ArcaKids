import { locationModule } from '@/features/location/native/location-module';
import { identityService } from '@/features/identity/services/identity-service';
import { notificationService } from '@/features/notifications';
import { parentalService } from '@/features/parental/services/parental-service';

export interface LocationUpdate {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceUuid: string;
  childId: string;
}

export interface Geofence {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // meters
  childId: string;
  triggered: boolean;
  triggeredAt?: number | null;
}

export interface LocationState {
  isTracking: boolean;
  lastReading: LocationUpdate | null;
  geofences: Geofence[];
  lastGeofenceTrigger: Geofence | null;
}

export class LocationService {
  private readonly geofenceCheckInterval = 15000; // 15 seconds
  private geofenceTimeout = 60000; // 1 minute debounce
  private readonly: boolean = false;

  // Public state
  public lastReading: LocationUpdate | null = null;
  public geofences: Geofence[] = [];
  public _watchId: number | undefined = undefined;
  public geofenceTriggeredAt: Record<string, number> = {};

  constructor() {
    this.loadGeofences();
  }

  private loadGeofences() {
    // TODO: Load geofences from Supabase or local storage
    // this.geofences = await geofenceRepository.getAll();
    console.log('Geofences loaded (stub)');
  }

  async initialize(): Promise<void> {
    const hasPermission = await locationModule.hasPermission();
    if (!hasPermission) {
      const requested = await locationModule.requestPermission();
      if (!requested) {
        console.warn('Location permission not granted');
        return;
      }
    }

    // Load existing geofences
    await this.loadGeofencesFromStorage();

    // Start monitoring — always report GPS, with or without geofences
    this.startLocationMonitoring();
  }

  private async loadGeofencesFromStorage() {
    // TODO: Load from Supabase or AsyncStorage
    // this.geofences = await geofenceRepository.getAll();
    console.log('Loading geofences from storage (stub)');
  }

  startLocationMonitoring() {
    if (this._watchId !== undefined) return;

    this._watchId = setInterval(async () => {
      await this.checkLocationAndGeofences();
    }, this.geofenceCheckInterval);

    // Immediate check
    this.checkLocationAndGeofences().catch(console.error);
  }

  stopLocationMonitoring() {
    if (this._watchId !== undefined) {
      clearInterval(this._watchId);
      this._watchId = undefined;
    }
  }

  private async checkLocationAndGeofences() {
    const reading = await locationModule.getCurrentLocation();
    if (!reading) return;

    const update: LocationUpdate = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: reading.timestamp,
      latitude: reading.latitude,
      longitude: reading.longitude,
      accuracy: reading.accuracy,
      deviceUuid: await this.getDeviceUuid(),
      childId: await this.getChildId(),
    };

    this.lastReading = update;
    this.saveLocationUpdate(update);

    // Check against all geofences
    for (const geofence of this.geofences) {
      if (geofence.triggered) continue; // Already triggered today

      // Use locationModule.isInsideGeofence instead of this.isInsideGeofence
      const inside = await locationModule.isInsideGeofence(
        reading.latitude,
        reading.longitude,
        {
          id: geofence.id,
          name: geofence.name,
          latitude: geofence.latitude,
          longitude: geofence.longitude,
          radius: geofence.radius,
          triggered: geofence.triggered,
          childId: geofence.childId,
        }
      );

      if (inside) {
        const lastTriggered = this.geofenceTriggeredAt[geofence.id] || 0;
        const now = Date.now();

        // Debounce: only trigger once per geofence per timeout period
        if (now - lastTriggered > this.geofenceTimeout) {
          this.geofenceTriggeredAt = this.geofenceTriggeredAt || {};
          this.geofenceTriggeredAt[geofence.id] = now;
          geofence.triggered = true;
          geofence.triggeredAt = now;

          await this.handleGeofenceTrigger(geofence, update);
        }
      }
    }

    // Sync to Supabase
    await this.syncLocationUpdate(update);
  }

  private async handleGeofenceTrigger(geofence: Geofence, location: LocationUpdate) {
    // TODO: Could trigger notification, log event, etc.
    console.log('Geofence triggered:', geofence.name, 'at', location);

    // Schedule push notification
    try {
      await notificationService.scheduleGeofenceEnterNotification(
        geofence.name,
        geofence.childId ? 'Niño' : 'Usuario'
      );
    } catch (e) {
      console.error('Failed to schedule geofence notification:', e);
    }

    // Update in storage
    // await geofenceRepository.update(geofence.id, { triggered: true, triggeredAt: Date.now() });

    // Could trigger push notification, database event, etc.
  }

  private async getDeviceUuid(): Promise<string> {
    const device = await identityService.getLocalDevice();
    return device.deviceUuid;
  }

  private async getChildId(): Promise<string> {
    const childInfo = await identityService.getChildInfo();
    return childInfo?.childId ?? '';
  }

  private async saveLocationUpdate(update: LocationUpdate) {
    // TODO: Save to AsyncStorage or Supabase
    // localStorage.setItem('last_location', JSON.stringify(update));
  }

  private async syncLocationUpdate(update: LocationUpdate) {
    try {
      await parentalService.reportLocation(
        update.childId,
        update.latitude,
        update.longitude
      );
    } catch (e) {
      console.error('Failed to sync location:', e);
    }
  }

  getState(): LocationState {
    return {
      isTracking: this._watchId !== undefined,
      lastReading: this.lastReading,
      geofences: [...this.geofences],
      lastGeofenceTrigger: this.geofences.find(g => g.triggered) ?? null,
    };
  }

  updateGeofences(geofences: Geofence[]) {
    this.geofences = geofences;
    this.saveGeofences();
    if (this._watchId !== undefined) {
      this.startLocationMonitoring();
    }
  }

  private saveGeofences() {
    // TODO: Persist geofences to Supabase/AsyncStorage
    // localStorage.setItem('geofences', JSON.stringify(this.geofences));
  }
}

export const locationServiceInstance = new LocationService();
export default locationServiceInstance;