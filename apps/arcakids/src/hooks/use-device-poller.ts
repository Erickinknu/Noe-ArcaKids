import { useEffect, useState, useCallback } from 'react';
import { parentalService } from '@/features/parental/services/parental-service';
import { parentalRepository } from '@/features/parental/repositories/parental-repository';
import { parentalBridge } from '@/features/parental/native/parental-bridge';
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
      const childInfo = await identityService.getChildInfo();
      const childId = childInfo?.childId;
      if (!childId) return;

      const result = await parentalService.checkDeviceState(childId);
      if (result) {
        setState({
          isBlocked: result.isBlocked,
          alertActive: result.alertActive,
          alertStartedAt: result.alertStartedAt,
        });

        // Write device state to a separate SharedPreferences key so the
        // enforcement service can merge it without overwriting rule fields.
        parentalBridge.updateDeviceState({
          isBlocked: result.isBlocked,
          alertActive: result.alertActive,
        });

        // Fetch app categories and build enforcement state with per-app limits.
        const appCategories =
          await parentalRepository.getAppCategories(childId);
        const limitedApps =
          parentalService.getLimitedApps(appCategories);
        const appLimitsObj: Record<string, number> = {};
        limitedApps.forEach((limit, pkg) => {
          appLimitsObj[pkg] = limit;
        });

        const device = await identityService.getLocalDevice();
        const rules = await parentalService.getRulesForDevice(
          device.deviceUuid
        );
        const enforcementState =
          parentalService.buildEnforcementState(
            rules,
            null,
            appCategories
          );
        parentalBridge.updateEnforcementState({
          ...enforcementState,
          appLimits: appLimitsObj,
        });
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
      const childInfo = await identityService.getChildInfo();
      const childId = childInfo?.childId;
      if (!childId) return;
      await parentalService.dismissAlert(childId);
      setState((prev) =>
        prev ? { ...prev, alertActive: false, alertStartedAt: null } : null
      );
    } catch (e) {
      console.warn('Dismiss alert error:', e);
    }
  }, []);

  return { ...state, dismissAlert };
}
