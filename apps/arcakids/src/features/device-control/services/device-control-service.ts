/**
 * Child-side device-control service: applies Realtime commands to the local device.
 *
 * Layering: Screen -> Hook -> Service -> Repository -> Supabase RPC / Native bridge.
 * Device Owner path uses DevicePolicyManager via deviceOwnerBridge.
 * Non-owner path falls back to EnforcementService overlay + parentalBridge.
 */

import { locationModule } from '@/features/location/native/location-module';
import { parentalBridge } from '@/features/parental/native/parental-bridge';

import { deviceOwnerBridge } from '../native/device-owner-module';
import { deviceControlRepository } from '../repositories/device-control-repository';

import type { DeviceCommand } from '@noe-arcakids/types';

export type CommandResult = { acknowledged: boolean; usedFallback: boolean };

export const deviceControlService = {
  async applyCommand(deviceUuid: string, cmd: DeviceCommand): Promise<CommandResult> {
    const ownerAvailable = deviceOwnerBridge.isAvailable();
    let isOwner = false;
    if (ownerAvailable) {
      try {
        isOwner = await deviceOwnerBridge.isDeviceOwner();
      } catch {
        isOwner = false;
      }
    }

    let usedFallback = false;

    try {
      switch (cmd.command) {
        case 'LOCK': {
          if (isOwner) {
            await deviceOwnerBridge.lockNow();
            // Pin ARCA KIDS so leaving the app is not possible (kiosk).
            try { await deviceOwnerBridge.startLockTask(); } catch { /* best-effort */ }
          } else {
            // Fallback: mark device as locked so EnforcementService blocks via overlay
            await parentalBridge.updateDeviceState({ isBlocked: true, alertActive: false });
            usedFallback = true;
          }
          break;
        }
        case 'UNLOCK': {
          await parentalBridge.updateDeviceState({ isBlocked: false, alertActive: false });
          if (isOwner) {
            try { await deviceOwnerBridge.stopLockTask(); } catch { /* best-effort */ }
          } else {
            usedFallback = true;
          }
          break;
        }
        case 'BLOCK_APPS': {
          const packages = extractPackageList(cmd.payload);
          if (packages.length > 0) {
            if (isOwner) {
              try {
                await deviceOwnerBridge.setPackagesSuspended(packages, true);
              } catch {
                // Fallback to enforcement state blocking
                await applyToEnforcement(packages, true);
                usedFallback = true;
              }
            } else {
              await applyToEnforcement(packages, true);
              usedFallback = true;
            }
          }
          break;
        }
        case 'UNBLOCK_APPS': {
          const packages = extractPackageList(cmd.payload);
          if (packages.length > 0) {
            if (isOwner) {
              try {
                await deviceOwnerBridge.setPackagesSuspended(packages, false);
              } catch {
                await applyToEnforcement(packages, false);
                usedFallback = true;
              }
            } else {
              await applyToEnforcement(packages, false);
              usedFallback = true;
            }
          }
          break;
        }
        case 'SET_POLICY': {
          // Payload contains daily_limit_minutes, bedtime, blocked_packages.
          // Persist into enforcement state so EnforcementService enforces even offline.
          const payload = (cmd.payload ?? {}) as Record<string, unknown>;
          await applyPolicyToEnforcement(payload);
          if (isOwner && Array.isArray(payload.blocked_packages)) {
            // Optionally mirror to DPM suspend — best-effort
            const pkgs = (payload.blocked_packages as string[]).filter(Boolean);
            if (pkgs.length > 0) {
              try {
                await deviceOwnerBridge.setPackagesSuspended(pkgs, true);
              } catch {
                // ignore, enforcement state already covers it
              }
            }
          }
          break;
        }
        case 'REQUEST_LOCATION': {
          const reading = await locationModule.getCurrentLocation();
          if (reading) {
            await deviceControlRepository.reportStatus(deviceUuid, {
              latitude: reading.latitude,
              longitude: reading.longitude,
              isLocked: false,
            });
          } else {
            await deviceControlRepository.reportStatus(deviceUuid, { isLocked: false });
          }
          break;
        }
        case 'LOCK_TASK': {
          const enabled = Boolean((cmd.payload ?? {}).enabled);
          if (isOwner) {
            if (enabled) await deviceOwnerBridge.startLockTask();
            else await deviceOwnerBridge.stopLockTask();
          }
          break;
        }
        case 'SCREEN_CAPTURE': {
          const disabled = Boolean((cmd.payload ?? {}).disabled);
          if (isOwner) {
            await deviceOwnerBridge.setScreenCaptureDisabled(disabled);
          }
          break;
        }
        case 'CAMERA': {
          const disabled = Boolean((cmd.payload ?? {}).disabled);
          if (isOwner) {
            await deviceOwnerBridge.setCameraDisabled(disabled);
          }
          break;
        }
        case 'HIDE_APPS': {
          const packages = extractPackageList(cmd.payload);
          if (isOwner && packages.length > 0) {
            await deviceOwnerBridge.setApplicationHidden(packages, true);
          }
          break;
        }
        case 'UNHIDE_APPS': {
          const packages = extractPackageList(cmd.payload);
          if (isOwner && packages.length > 0) {
            await deviceOwnerBridge.setApplicationHidden(packages, false);
          }
          break;
        }
        case 'UNINSTALL_LOCK': {
          const payloadN = (cmd.payload ?? {}) as {
            packages?: string[];
            locked?: boolean;
            restrictions?: Record<string, boolean>;
          };
          if (isOwner) {
            if (Array.isArray(payloadN.packages) && payloadN.packages.length > 0) {
              await deviceOwnerBridge.setUninstallBlocked(payloadN.packages, Boolean(payloadN.locked));
            }
            const restrictions = payloadN.restrictions ?? {};
            for (const [restriction, enabled] of Object.entries(restrictions)) {
              await deviceOwnerBridge.setUserRestriction(restriction, Boolean(enabled));
            }
          }
          break;
        }
        case 'FORCE_STOP': {
          const packages = extractPackageList(cmd.payload);
          if (isOwner && packages.length > 0) {
            await deviceOwnerBridge.forceStopPackages(packages);
          }
          break;
        }
        case 'WIPE_DEVICE': {
          if (isOwner) {
            await deviceOwnerBridge.wipeData(0);
          }
          break;
        }
        case 'LIST_APPS': {
          const apps = await deviceOwnerBridge.getInstalledApps();
          await deviceControlRepository.reportApps(deviceUuid, apps);
          break;
        }
        default:
          break;
      }

      await deviceControlRepository.ackCommand(cmd.id, deviceUuid, 'executed');
      return { acknowledged: true, usedFallback };
    } catch {
      try {
        await deviceControlRepository.ackCommand(cmd.id, deviceUuid, 'failed');
      } catch {
        // ignore ack failure
      }
      return { acknowledged: false, usedFallback };
    }
  },

  async reportHeartbeat(
    deviceUuid: string,
    info: {
      familyId?: string | null;
      childId?: string | null;
      battery?: number | null;
      latitude?: number | null;
      longitude?: number | null;
      currentApp?: string | null;
      isLocked?: boolean;
    }
  ): Promise<void> {
    await deviceControlRepository.reportStatus(deviceUuid, info);
  },

  async syncPendingCommands(deviceUuid: string): Promise<DeviceCommand[]> {
    return deviceControlRepository.getPendingCommands(deviceUuid);
  },
};

function extractPackageList(payload: Record<string, unknown> | null): string[] {
  if (!payload) return [];
  const direct = payload.packages ?? payload.blocked_packages ?? payload.blockedPackages;
  if (Array.isArray(direct)) return (direct as unknown[]).filter((v): v is string => typeof v === 'string' && v.length > 0);
  if (typeof payload.packageName === 'string') return [payload.packageName];
  return [];
}

async function applyToEnforcement(packages: string[], block: boolean): Promise<void> {
  // Per-package blocking only: merge the packages into the persisted enforcement
  // state (native side keeps bedtime/limits/appLimits intact). No total device lock.
  try {
    await parentalBridge.updateBlockedPackages(packages, block);
  } catch {
    // Last resort: make sure the overlay enforcer is running; the native merge
    // is the source of truth, so this is best-effort for offline edge cases.
    try {
      await parentalBridge.startEnforcement();
    } catch {
      // ignore
    }
  }
}

async function applyPolicyToEnforcement(payload: Record<string, unknown>): Promise<void> {
  const dailyLimit = typeof payload.daily_limit_minutes === 'number' ? payload.daily_limit_minutes : null;
  const bedtimeEnabled = Boolean(payload.bedtime_enabled);
  const bedtimeStart = typeof payload.bedtime_start === 'string' ? payload.bedtime_start : null;
  const bedtimeEnd = typeof payload.bedtime_end === 'string' ? payload.bedtime_end : null;
  const blockedPackages = Array.isArray(payload.blocked_packages)
    ? (payload.blocked_packages as string[]).filter((v) => typeof v === 'string')
    : [];

  const synthetic = {
    enforce: true,
    bedtimeEnabled,
    bedtimeStart,
    bedtimeEnd,
    dailyLimitMinutes: dailyLimit,
    bonusMinutes: 0,
    pausedUntil: null,
    blockedPackages,
  };
  await parentalBridge.updateEnforcementState(synthetic);
}
