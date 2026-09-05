/**
 * Remote-control runner for the child device.
 *
 * Wires the realtime subscription (device_command_events) plus periodic
 * polling (get_device_commands_for_device RPC) into the local command
 * executor (deviceControlService.applyCommand). Executes LOCK / BLOCK_APPS /
 * LOCK_TASK / SCREEN_CAPTURE / CAMERA / HIDE_APPS / ... as soon as the parent
 * enqueues them, and re-syncs when the app returns to the foreground.
 */

import { AppState, type AppStateStatus } from 'react-native';

import { identityService } from '@/features/identity/services/identity-service';

import { subscribeToCommands } from '../realtime/command-subscription';
import { deviceControlRepository } from '../repositories/device-control-repository';
import { deviceControlService } from './device-control-service';

import type { DeviceCommand } from '@noe-arcakids/types';

const SYNC_INTERVAL_MS = 20000;

const processed = new Set<string>();
let started = false;
let unsubscribe: (() => void) | null = null;
let syncTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;

async function apply(cmd: DeviceCommand): Promise<void> {
  if (processed.has(cmd.id)) return;
  processed.add(cmd.id);
  try {
    await deviceControlService.applyCommand(cmd.deviceUuid, cmd);
  } catch {
    try {
      await deviceControlRepository.ackCommand(cmd.id, cmd.deviceUuid, 'failed');
    } catch {
      // last-resort: leave pending so a later sync retries
    }
  }
}

async function syncNow(): Promise<void> {
  try {
    const device = await identityService.getLocalDevice();
    const pending = await deviceControlService.syncPendingCommands(device.deviceUuid);
    await Promise.all(pending.map((cmd) => apply(cmd).catch(() => undefined)));
  } catch {
    // offline / supabase not configured: retry on next tick
  }
}

export function startRemoteControl(): void {
  if (started) return;
  started = true;

  void (async () => {
    try {
      const device = await identityService.getLocalDevice();
      unsubscribe = subscribeToCommands(device.deviceUuid, (cmd) => apply(cmd)).unsubscribe;
    } catch {
      // subscription fails only when supabase is not configured; polling still runs
    }
  })();

  void syncNow();
  syncTimer = setInterval(() => void syncNow(), SYNC_INTERVAL_MS);
  appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'active') void syncNow();
  });
}

export function stopRemoteControl(): void {
  started = false;
  unsubscribe?.();
  unsubscribe = null;
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = null;
  appStateSub?.remove();
  appStateSub = null;
  processed.clear();
}