import { NativeModules, Platform } from 'react-native';

import type { DeviceOwnerState } from '@noe-arcakids/types';

interface NativeDeviceOwner {
  isDeviceOwner(): Promise<boolean>;
  isAdminActive(): Promise<boolean>;
  canSuspendPackages(): Promise<boolean>;
  lockNow(): Promise<boolean>;
  setPackagesSuspended(packageNamesJson: string, suspended: boolean): Promise<string[]>;
  setUserRestriction(restriction: string, enabled: boolean): Promise<boolean>;
  wipeData(flags: number): Promise<boolean>;
  hasSystemAlertWindowPermission(): Promise<boolean>;
  openSystemAlertWindowSettings(): Promise<null>;
  getProvisioningExtras(): Promise<{
    familyId: string | null;
    childId: string | null;
    code: string | null;
    payload: string | null;
  }>;
  clearProvisioningExtras(): Promise<boolean>;
}

const isAndroid = Platform.OS === 'android';
const native: NativeDeviceOwner | undefined = isAndroid
  ? (NativeModules.DeviceOwner as NativeDeviceOwner | undefined)
  : undefined;

function assertNative(method: string): NativeDeviceOwner {
  if (!native) throw new Error(`DeviceOwner.${method} is only available on Android.`);
  return native;
}

export const deviceOwnerBridge = {
  isAvailable(): boolean {
    return isAndroid && Boolean(native);
  },

  async getState(): Promise<DeviceOwnerState> {
    if (!native) return { isDeviceOwner: false, isAdminActive: false, canSuspendPackages: false };
    const [isDeviceOwner, isAdminActive, canSuspendPackages] = await Promise.all([
      native.isDeviceOwner().catch(() => false),
      native.isAdminActive().catch(() => false),
      native.canSuspendPackages().catch(() => false),
    ]);
    return { isDeviceOwner, isAdminActive, canSuspendPackages };
  },

  async isDeviceOwner(): Promise<boolean> {
    if (!native) return false;
    return native.isDeviceOwner();
  },

  async lockNow(): Promise<boolean> {
    assertNative('lockNow');
    return native!.lockNow();
  },

  async setPackagesSuspended(packageNames: string[], suspended: boolean): Promise<string[]> {
    assertNative('setPackagesSuspended');
    return native!.setPackagesSuspended(JSON.stringify(packageNames), suspended);
  },

  async setUserRestriction(restriction: string, enabled: boolean): Promise<boolean> {
    assertNative('setUserRestriction');
    return native!.setUserRestriction(restriction, enabled);
  },

  async wipeData(flags = 0): Promise<boolean> {
    assertNative('wipeData');
    return native!.wipeData(flags);
  },

  async hasOverlayPermission(): Promise<boolean> {
    if (!native) return false;
    return native.hasSystemAlertWindowPermission();
  },

  async openOverlaySettings(): Promise<void> {
    assertNative('openSystemAlertWindowSettings');
    await native!.openSystemAlertWindowSettings();
  },

  async getProvisioningExtras(): Promise<{
    familyId: string | null;
    childId: string | null;
    code: string | null;
    payload: string | null;
  }> {
    if (!native) return { familyId: null, childId: null, code: null, payload: null };
    return native.getProvisioningExtras();
  },

  async clearProvisioningExtras(): Promise<boolean> {
    if (!native) return false;
    return native.clearProvisioningExtras();
  },
};
