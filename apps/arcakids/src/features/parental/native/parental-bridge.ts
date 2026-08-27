import { NativeModules, Platform } from 'react-native';

export interface LaunchableApp {
  packageName: string;
  label: string;
}

export interface EnforcementState {
  enforce: boolean;
  bedtimeEnabled: boolean;
  bedtimeStart: string | null;
  bedtimeEnd: string | null;
  dailyLimitMinutes: number | null;
  bonusMinutes: number;
  pausedUntil: number | null;
  blockedPackages: string[];
  appLimits?: Record<string, number>;
}

interface NativeParentalUsage {
  hasUsageStatsPermission(): Promise<boolean>;
  openUsageAccessSettings(): Promise<null>;
  isDefaultLauncher(): Promise<boolean>;
  openDefaultAppsSettings(): Promise<null>;
  getUsageTodayMinutes(): Promise<Record<string, number>>;
  getLaunchableApps(): Promise<LaunchableApp[]>;
  launchApp(packageName: string): Promise<boolean>;
  updateEnforcementState(stateJson: string): Promise<null>;
  updateDeviceState(deviceStateJson: string): Promise<null>;
  startEnforcement(): Promise<null>;
  stopEnforcement(): Promise<null>;
}

const isAndroid = Platform.OS === 'android';
const native: NativeParentalUsage | undefined = isAndroid
  ? (NativeModules.ParentalUsage as NativeParentalUsage | undefined)
  : undefined;

function assertNative(method: string): NativeParentalUsage {
  if (!native) {
    throw new Error(`ParentalUsage.${method} is only available on Android.`);
  }
  return native;
}

export const parentalBridge = {
  isAvailable(): boolean {
    return isAndroid && Boolean(native);
  },

  async hasUsageStatsPermission(): Promise<boolean> {
    if (!native) return false;
    return native.hasUsageStatsPermission();
  },

  async openUsageAccessSettings(): Promise<void> {
    assertNative('openUsageAccessSettings');
    await native!.openUsageAccessSettings();
  },

  async isDefaultLauncher(): Promise<boolean> {
    if (!native) return false;
    return native.isDefaultLauncher();
  },

  async openDefaultAppsSettings(): Promise<void> {
    assertNative('openDefaultAppsSettings');
    await native!.openDefaultAppsSettings();
  },

  async getUsageTodayMinutes(): Promise<Record<string, number>> {
    if (!native) return {};
    return native.getUsageTodayMinutes();
  },

  async getLaunchableApps(): Promise<LaunchableApp[]> {
    if (!native) return [];
    return native.getLaunchableApps();
  },

  async launchApp(packageName: string): Promise<boolean> {
    if (!native) return false;
    return native.launchApp(packageName);
  },

  async updateEnforcementState(state: EnforcementState): Promise<void> {
    assertNative('updateEnforcementState');
    await native!.updateEnforcementState(JSON.stringify(state));
  },

  async updateDeviceState(deviceState: {
    isBlocked: boolean;
    alertActive: boolean;
  }): Promise<void> {
    assertNative('updateDeviceState');
    await native!.updateDeviceState(JSON.stringify(deviceState));
  },

  async startEnforcement(): Promise<void> {
    assertNative('startEnforcement');
    await native!.startEnforcement();
  },

  async stopEnforcement(): Promise<void> {
    assertNative('stopEnforcement');
    await native!.stopEnforcement();
  },
};
