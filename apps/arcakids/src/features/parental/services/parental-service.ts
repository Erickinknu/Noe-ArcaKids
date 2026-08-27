import type {
  DeviceRules,
  RestrictionReason,
  UsageEntry,
} from '@noe-arcakids/types';

import {
  parentalBridge,
  type EnforcementState,
} from '../native/parental-bridge';
import { parentalRepository } from '../repositories/parental-repository';

export interface UsageSnapshot {
  perApp: Record<string, number>;
  totalMinutes: number;
}

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map((part) => Number.parseInt(part, 10));
  return hours * 60 + minutes;
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWithinBedtime(rules: DeviceRules, now = new Date()): boolean {
  if (!rules.bedtimeEnabled || !rules.bedtimeStart || !rules.bedtimeEnd) {
    return false;
  }
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(rules.bedtimeStart);
  const end = toMinutes(rules.bedtimeEnd);
  if (start === end) {
    return false;
  }
  // Overnight window (e.g. 21:00 -> 07:00) wraps around midnight.
  return start < end
    ? nowMinutes >= start && nowMinutes < end
    : nowMinutes >= start || nowMinutes < end;
}

export const parentalService = {
  getRulesForDevice(deviceUuid: string): Promise<DeviceRules | null> {
    return parentalRepository.getRulesForDevice(deviceUuid);
  },

  async getUsageSnapshot(): Promise<UsageSnapshot> {
    const raw = await parentalBridge.getUsageTodayMinutes();
    const perApp: Record<string, number> = {};
    let totalMinutes = 0;
    for (const [packageName, minutes] of Object.entries(raw)) {
      if (packageName === 'total' || !Number.isFinite(minutes) || minutes <= 0) {
        continue;
      }
      perApp[packageName] = minutes;
      totalMinutes += minutes;
    }
    return { perApp, totalMinutes };
  },

  evaluateRestriction(
    rules: DeviceRules,
    snapshot: UsageSnapshot
  ): RestrictionReason {
    if (isWithinBedtime(rules)) {
      return 'bedtime';
    }
    if (
      rules.dailyLimitMinutes !== null &&
      snapshot.totalMinutes >= rules.dailyLimitMinutes
    ) {
      return 'dailyLimit';
    }
    return null;
  },

  /** Pushes today's per-app usage to the backend (idempotent upsert). */
  async syncUsage(deviceUuid: string, snapshot: UsageSnapshot): Promise<void> {
    const entries: UsageEntry[] = Object.entries(snapshot.perApp).map(
      ([packageName, minutes]) => ({ packageName, minutes })
    );
    await parentalRepository.reportUsage(deviceUuid, localDateKey(), entries);
  },

  buildEnforcementState(
    rules: DeviceRules | null,
    snapshot: UsageSnapshot | null,
    appCategories?: {
      packageName: string;
      category: string;
      timeLimitMinutes: number | null;
    }[]
  ): EnforcementState {
    const blockedFromCategories =
      appCategories
        ?.filter((c) => c.category === 'blocked')
        .map((c) => c.packageName) ?? [];

    const allBlocked = [
      ...(rules?.blockedPackages ?? []),
      ...blockedFromCategories,
    ];

    return {
      enforce: rules !== null,
      bedtimeEnabled: rules?.bedtimeEnabled ?? false,
      bedtimeStart: rules?.bedtimeStart ?? null,
      bedtimeEnd: rules?.bedtimeEnd ?? null,
      dailyLimitMinutes: rules?.dailyLimitMinutes ?? null,
      bonusMinutes: 0,
      pausedUntil: null,
      blockedPackages: allBlocked,
    };
  },

  getLimitedApps(
    appCategories: {
      packageName: string;
      category: string;
      timeLimitMinutes: number | null;
    }[]
  ): Map<string, number> {
    const limits = new Map<string, number>();
    for (const cat of appCategories) {
      if (cat.category === 'limited' && cat.timeLimitMinutes != null) {
        limits.set(cat.packageName, cat.timeLimitMinutes);
      }
    }
    return limits;
  },

  /** Caches the enforcement state for the native foreground service. */
  async syncEnforcementState(
    rules: DeviceRules | null,
    snapshot: UsageSnapshot | null
  ): Promise<void> {
    await parentalBridge.updateEnforcementState(
      parentalService.buildEnforcementState(rules, snapshot)
    );
  },

  async checkDeviceState(
    childId: string
  ): Promise<{
    isBlocked: boolean;
    alertActive: boolean;
    alertStartedAt: string | null;
  } | null> {
    return parentalRepository.getDeviceState(childId);
  },

  async dismissAlert(childId: string): Promise<void> {
    return parentalRepository.dismissAlert(childId);
  },

  async reportLocation(
    childId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    return parentalRepository.reportLocation(childId, latitude, longitude);
  },
};
