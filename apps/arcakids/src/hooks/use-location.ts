import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { locationModule } from '@/features/location/native/location-module';
import {
  locationService,
  type Geofence,
  type LocationUpdate,
  type LocationState,
} from '@/features/location';
import { identityService } from '@/features/identity/services/identity-service';

export interface UseLocationReturn {
  state: LocationState;
  isTracking: boolean;
  startTracking: () => void;
  stopTracking: () => void;
  refresh: () => void;
  geofences: Geofence[];
  triggerGeofence: (geofenceId: string) => Promise<void>;
}

export function useLocation(): UseLocationReturn {
  const [state, setState] = useState<LocationState>(locationService.getState());
  const [isTracking, setIsTracking] = useState(false);
  const lastCheckRef = useRef<number>(Date.now());
  const [geofenceTriggeredAt, setGeofenceTriggeredAt] = useState<Record<string, number>>({});

  const refresh = useCallback(() => {
    void checkLocationAndGeofences();
  }, []);

  const checkLocationAndGeofences = useCallback(async () => {
    const reading = await locationModule.getCurrentLocation();
    if (!reading) return;

    const childInfo = await identityService.getChildInfo();
    const childId = childInfo?.childId ?? '';

    const update: LocationUpdate = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: reading.timestamp,
      latitude: reading.latitude,
      longitude: reading.longitude,
      accuracy: reading.accuracy,
      deviceUuid: (await identityService.getLocalDevice()).deviceUuid,
      childId,
    };

    // Update state with new reading
    setState(prev => ({
      ...prev,
      lastReading: update,
      isTracking: true,
      geofences: prev.geofences.map((g: Geofence) => {
        // Check if this reading is inside this geofence
        const inside =
          g.latitude === reading.latitude && g.longitude === reading.longitude;
        if (inside && !g.triggered) {
          // Check debounce using external state
          const lastTriggered = geofenceTriggeredAt[g.id] || 0;
          if (Date.now() - lastTriggered > 60000) {
            // 1 minute debounce
            setGeofenceTriggeredAt(prev => ({ ...prev, [g.id]: Date.now() }));
            // Return updated geofence
            return { ...g, triggered: true, triggeredAt: Date.now() };
          }
        }
        return g;
      }),
      lastGeofenceTrigger: prev.lastGeofenceTrigger,
    }));

    // Trigger any new geofence events from stored state
    for (const geofence of state.geofences) {
      if (geofence.triggered) continue;

      const inside =
        geofence.latitude === reading.latitude &&
        geofence.longitude === reading.longitude;

      if (inside) {
        const lastTriggered = geofenceTriggeredAt[geofence.id] || 0;
        if (Date.now() - lastTriggered > 60000) {
          // Debounce 1 minute
          setGeofenceTriggeredAt(prev => ({ ...prev, [geofence.id]: Date.now() }));
          setState(prev => ({
            ...prev,
            lastGeofenceTrigger: { ...geofence, triggered: true, triggeredAt: Date.now() },
          }));
        }
      }
    }
  }, [geofenceTriggeredAt, state.geofences]);

  useEffect(() => {
    // Initialize location service
    void locationService.initialize();

    // Start tracking when hook mounts
    // @ts-ignore - startTracking exists on instance
    locationService.startTracking();
    setIsTracking(true);

    // Cleanup on unmount
    return () => {
      // @ts-ignore - stopTracking exists on instance
      locationService.stopTracking();
      setIsTracking(false);
    };
  }, []);

  useEffect(() => {
    // Re-check when app comes to foreground
    const appState = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void checkLocationAndGeofences();
      }
    });

    return () => {
      appState.remove();
    };
  }, [checkLocationAndGeofences]);

  return {
    state,
    isTracking,
    startTracking: () => {
      // @ts-ignore
      locationService.startTracking();
      setIsTracking(true);
    },
    stopTracking: () => {
      // @ts-ignore
      locationService.stopTracking();
      setIsTracking(false);
    },
    refresh,
    geofences: state.geofences,
    triggerGeofence: async (geofenceId: string) => {
      const geofence = state.geofences.find((g: Geofence) => g.id === geofenceId);
      if (geofence) {
        await locationService.updateGeofences([{ ...geofence, triggered: true, triggeredAt: Date.now() }]);
      }
    },
  };
}