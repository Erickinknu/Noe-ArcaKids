import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import type {
  DeviceRules,
  RestrictionReason,
} from '@noe-arcakids/types';

import { identityService } from '@/features/identity/services/identity-service';

import { parentalBridge } from '@/features/parental/native/parental-bridge';
import {
  parentalService,
  type UsageSnapshot,
} from '@/features/parental/services/parental-service';

const POLL_INTERVAL_MS = 60_000;
const SYNC_INTERVAL_MS = 5 * 60_000;

export interface ParentalStatus {
  rules: DeviceRules | null;
  snapshot: UsageSnapshot | null;
  reason: RestrictionReason;
  loading: boolean;
  hasUsagePermission: boolean;
  isLauncher: boolean;
  refresh: () => void;
}

/**
 * Polls the child's parental rules and today's usage while the app is open,
 * evaluates whether usage is restricted and periodically reports usage.
 */
export function useParentalStatus(enabled: boolean): ParentalStatus {
  const [rules, setRules] = useState<DeviceRules | null>(null);
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(null);
  const [reason, setReason] = useState<RestrictionReason>(null);
  const [loading, setLoading] = useState(enabled);
  const [hasUsagePermission, setHasUsagePermission] = useState(false);
  const [isLauncher, setIsLauncher] = useState(false);
  const lastSyncRef = useRef(0);
  const serviceStartedRef = useRef(false);

  const evaluate = useCallback(async () => {
    if (!enabled) {
      return;
    }
    try {
      const device = await identityService.getLocalDevice();
      const [permission, launcher, nextRules, nextSnapshot] = await Promise.all([
        parentalBridge.hasUsageStatsPermission().catch(() => false),
        parentalBridge.isDefaultLauncher().catch(() => false),
        parentalService.getRulesForDevice(device.deviceUuid),
        parentalService.getUsageSnapshot().catch(() => null),
      ]);

      setHasUsagePermission(permission);
      setIsLauncher(launcher);
      setRules(nextRules);
      setSnapshot(nextSnapshot);
      setReason(
        nextRules && nextSnapshot
          ? parentalService.evaluateRestriction(nextRules, nextSnapshot)
          : null
      );

      if (
        nextSnapshot &&
        Date.now() - lastSyncRef.current >= SYNC_INTERVAL_MS
      ) {
        lastSyncRef.current = Date.now();
        await parentalService
          .syncUsage(device.deviceUuid, nextSnapshot)
          .catch(() => undefined);
      }

      // Keep the native enforcement service fed with fresh rules; start it once.
      await parentalService
        .syncEnforcementState(nextRules, nextSnapshot)
        .catch(() => undefined);
      if (nextRules && !serviceStartedRef.current) {
        serviceStartedRef.current = true;
        await parentalBridge.startEnforcement().catch(() => undefined);
      }
    } catch {
      // Offline or not linked yet: keep the previous status.
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let cancelled = false;
    const tick = () => {
      if (!cancelled) {
        void evaluate();
      }
    };
    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    // Re-evaluate as soon as the app comes back to the foreground (e.g. after
    // granting usage access or changing the default launcher in system settings).
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        tick();
      }
    });
    return () => {
      cancelled = true;
      clearInterval(interval);
      appState.remove();
    };
  }, [enabled, evaluate]);

  const refresh = useCallback(() => {
    setLoading(true);
    void evaluate();
  }, [evaluate]);

  return { rules, snapshot, reason, loading, hasUsagePermission, isLauncher, refresh };
}
