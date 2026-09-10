import { locationModule } from '@/features/location/native/location-module';
import { identityService } from '@/features/identity/services/identity-service';
import { notificationService } from '@/features/notifications';
import { parentalService } from '@/features/parental/services/parental-service';
import { geofenceRepository } from '@/features/location/repositories/geofence-repository';
import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { storage } from '@noe-arcakids/storage';
import type { Geofence, GeofenceEvent } from '@noe-arcakids/types';

export interface LocationUpdate {
  id: string;
  timestamp: number;
  latitude: number;
  longitude: number;
  accuracy: number;
  deviceUuid: string;
  childId: string;
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
    this.loadGeofences().catch(() => {});
  }

  private async loadGeofences() {
    try {
      const cached = await storage.get('location/geofences');
      if (cached) {
        this.geofences = JSON.parse(cached) as Geofence[];
      }
    } catch {
      // Ignore parse errors
    }
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

    // Restore last reading from cache
    try {
      const cached = await storage.get('location/lastReading');
      if (cached) {
        this.lastReading = JSON.parse(cached) as LocationUpdate;
      }
    } catch {
      // Ignore
    }

    await this.loadGeofencesFromSupabase();

    this.startLocationMonitoring();
  }

  private async loadGeofencesFromSupabase() {
    try {
      this.geofences = await geofenceRepository.getAll();
      console.log('Geofences loaded from Supabase:', this.geofences.length);
    } catch (e) {
      console.error('Failed to load geofences:', e);
    }
  }

  startLocationMonitoring() {
    if (this._watchId !== undefined) return;

    this._watchId = setInterval(async () => {
      await this.checkLocationAndGeofences();
    }, this.geofenceCheckInterval);

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

    if (this.geofences.length > 0) {
      await this.checkGeofencesViaSupabase(update);
    }

    await this.syncLocationUpdate(update);
  }

  private async checkGeofencesViaSupabase(update: LocationUpdate) {
    const deviceUuid = update.deviceUuid;
    if (!deviceUuid) return;

    try {
      const client = requireSupabaseClient();
      const { data: events, error } = await client.rpc('check_geofences_for_device', {
        p_device_uuid: deviceUuid,
        p_latitude: update.latitude,
        p_longitude: update.longitude,
      });

      if (error) {
        console.error('Supabase geofence check error:', error);
        return;
      }

      if (events && events.length > 0) {
        for (const event of events) {
          await this.handleGeofenceEvent(event, update);
        }
      }
    } catch (e) {
      console.error('Failed to check geofences via Supabase:', e);
    }
  }

  private async handleGeofenceEvent(event: GeofenceEvent, location: LocationUpdate) {
    const lastTriggered = this.geofenceTriggeredAt[event.geofenceId] || 0;
    const now = Date.now();

    if (now - lastTriggered > this.geofenceTimeout) {
      this.geofenceTriggeredAt[event.geofenceId] = now;

      const geofence = this.geofences.find(g => g.id === event.geofenceId);
      if (geofence) {
        geofence.triggered = true;
        geofence.triggeredAt = now;
      }

      await this.handleGeofenceTrigger(geofence, location, event.type);
    }
  }

  private async handleGeofenceTrigger(geofence: Geofence | undefined, location: LocationUpdate, type: 'enter' | 'exit') {
    const geofenceName = geofence?.name || 'Zona';

    console.log(`Geofence ${type}:`, geofenceName, 'at', location);

    try {
      if (type === 'enter') {
        await notificationService.scheduleGeofenceEnterNotification(
          geofenceName,
          location.childId ? 'Niño' : 'Usuario'
        );
      }
    } catch (e) {
      console.error('Failed to schedule geofence notification:', e);
    }

    const now = Date.now();

    if (geofence) {
      try {
        await geofenceRepository.update(geofence.id, { triggered: true, triggeredAt: now });
      } catch (e) {
        console.error('Failed to update geofence trigger:', e);
      }
    }
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
    try {
      await storage.save('location/lastReading', JSON.stringify(update));
    } catch {
      // Best-effort persistence
    }
  }

  private async syncLocationUpdate(update: LocationUpdate) {
    try {
      await parentalService.reportLocation(
        update.deviceUuid,
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
      lastGeofenceTrigger: this.geofences.find(g => (g as any).triggered) ?? null,
    };
  }

  updateGeofences(geofences: Geofence[]) {
    this.geofences = geofences;
    this.saveGeofences();
    if (this._watchId !== undefined) {
      this.startLocationMonitoring();
    }
  }

  private async saveGeofences() {
    try {
      await storage.save('location/geofences', JSON.stringify(this.geofences));
    } catch {
      // Best-effort persistence
    }
  }
}

export const locationServiceInstance = new LocationService();
export default locationServiceInstance;