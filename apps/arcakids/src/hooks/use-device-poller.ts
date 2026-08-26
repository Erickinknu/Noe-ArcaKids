import { useEffect, useState, useCallback } from 'react';
import { parentalService } from '@/features/parental/services/parental-service';
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
      }
    } catch (e) {
      console.warn('Device poller error:', e);
    }
  }, []);

  useEffect(() => {
    poll(); // immediate first check
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
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
