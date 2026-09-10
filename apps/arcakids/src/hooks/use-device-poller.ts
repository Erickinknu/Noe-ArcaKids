import { useEffect, useState, useCallback } from 'react';
import { env } from '@noe-arcakids/config';
import { parentalService } from '@/features/parental/services/parental-service';
import { parentalRepository } from '@/features/parental/repositories/parental-repository';
import { parentalBridge } from '@/features/parental/native/parental-bridge';
import { deviceControlService } from '@/features/device-control/services/device-control-service';
import { identityService } from '@/features/identity/services/identity-service';

interface DeviceState {
  isBlocked: boolean;
  alertActive: boolean;
  alertStartedAt: string | null;
}

const POLL_INTERVAL = 15000; // 15 seconds

export function useDevicePoller() {
  const [state, setState] = useState<DeviceState | null>(null);

  const poll = useCallback(async () => {
    try {
      const device = await identityService.getLocalDevice();
      const deviceUuid = device.deviceUuid;

      // 1) Heartbeat state poll: read the authoritative device flags (updates
      //    last_seen_at server-side) and mirror then to the native enforcer.
      let currentState: DeviceState | null = null;
      try {
        const result = await parentalService.checkDeviceState(deviceUuid);
        if (!result) return;
        currentState = {
          isBlocked: Boolean(result.isBlocked),
          alertActive: result.alertActive,
          alertStartedAt: result.alertStartedAt,
        };
        setState(currentState);

        // Write device state to a separate SharedPreferences key so the
        // enforcement service can merge it without overwriting rule fields.
        parentalBridge.updateDeviceState({
          isBlocked: currentState.isBlocked,
          alertActive: currentState.alertActive,
        });
      } catch (e) {
        console.warn('Device state poll error:', e);
        return;
      }

      // 2) Heartbeat: report device_status so NOE sees the device online and
      //    device_status.last_seen stays fresh. Runs even if other branches fail.
      try {
        await deviceControlService.reportHeartbeat(deviceUuid, {
          isLocked: currentState.isBlocked,
        });
      } catch (e) {
        console.warn('Device heartbeat error:', e);
      }

      // 3) Teach the native FGS the Supabase endpoint + linked device so it can
      //    report usage in the background even when the JS app is backgrounded.
      if (env.isSupabaseConfigured) {
        try {
          parentalBridge.configureUsageReporter({
            supabaseUrl: env.supabaseUrl,
            supabaseAnonKey: env.supabaseAnonKey,
            deviceUuid,
          });
        } catch (e) {
          console.warn('Usage reporter config error:', e);
        }
      }

      // While blocked the device-level flag is the authoritative total lock;
      // pushing rules-based enforcement state here would clobber it.
      if (currentState.isBlocked) return;

      // 4) Fetch app categories and build enforcement state with per-app limits.
      let appCategories: {
        packageName: string;
        category: string;
        timeLimitMinutes: number | null;
      }[] = [];
      try {
        appCategories = await parentalRepository.getAppCategories(deviceUuid);
      } catch (e) {
        console.warn('App categories fetch error:', e);
      }
      const limitedApps = parentalService.getLimitedApps(appCategories);
      const appLimitsObj: Record<string, number> = {};
      limitedApps.forEach((limit, pkg) => {
        appLimitsObj[pkg] = limit;
      });

      // 5) Rules enforcement (limits/bedtime/blocked apps) with category merge.
      try {
        const rules = await parentalService.getRulesForDevice(deviceUuid);
        const enforcementState = parentalService.buildEnforcementState(
          rules,
          null,
          appCategories
        );
        parentalBridge.updateEnforcementState({
          ...enforcementState,
          appLimits: appLimitsObj,
        });
      } catch (e) {
        console.warn('Rules enforcement sync error:', e);
      }
    } catch (e) {
      console.warn('Device poller error:', e);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const runPoll = async () => {
      if (cancelled) return;
      await poll();
    };
    runPoll();
    const interval = setInterval(() => {
      runPoll();
    }, POLL_INTERVAL);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [poll]);

  const dismissAlert = useCallback(async () => {
    try {
      const device = await identityService.getLocalDevice();
      await parentalService.dismissAlert(device.deviceUuid);
      setState((prev) =>
        prev ? { ...prev, alertActive: false, alertStartedAt: null } : null
      );
    } catch (e) {
      console.warn('Dismiss alert error:', e);
    }
  }, []);

  return { ...state, dismissAlert };
}
