import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { DatabaseError } from '@noe-arcakids/shared';

import type { DeviceCommand, DevicePolicy, DeviceStatus, InstalledApp } from '@noe-arcakids/types';

export interface DeviceState {
  childId: string;
  isBlocked: boolean;
  alertActive: boolean;
  alertStartedAt: string | null;
}

export interface ChildLocation {
  childId: string;
  displayName: string;
  avatarUrl: string | null;
  latitude: number;
  longitude: number;
  locationUpdatedAt: string | null;
  isOnline: boolean;
}

export const deviceControlService = {
  // ── Legacy device block (polling path, kept for backward compat) ──
  async blockChild(childId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('set_device_blocked', {
      p_child_id: childId,
      p_blocked: true,
    });
    if (error) throw new DatabaseError(error.message);
  },

  async unblockChild(childId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('set_device_blocked', {
      p_child_id: childId,
      p_blocked: false,
    });
    if (error) throw new DatabaseError(error.message);
  },

  async triggerAlert(childId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('trigger_device_alert', {
      p_child_id: childId,
    });
    if (error) throw new DatabaseError(error.message);
  },

  async dismissAlert(childId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('dismiss_device_alert', {
      p_child_id: childId,
    });
    if (error) throw new DatabaseError(error.message);
  },

  async getDeviceState(childId: string): Promise<DeviceState | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_device_state', {
      p_child_id: childId,
    });
    if (error) throw new DatabaseError(error.message);
    const row = (data as unknown[] | null)?.[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      childId,
      isBlocked: Boolean(row.is_blocked),
      alertActive: Boolean(row.alert_active),
      alertStartedAt: (row.alert_started_at as string | null) ?? null,
    };
  },

  async getChildrenLocations(): Promise<ChildLocation[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_children_locations');
    if (error) throw new DatabaseError(error.message);
    return ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        childId: r.child_id as string,
        displayName: r.display_name as string,
        avatarUrl: r.avatar_url as string | null,
        latitude: r.latitude as number,
        longitude: r.longitude as number,
        locationUpdatedAt: r.location_updated_at as string | null,
        isOnline: Boolean(r.is_online),
      };
    });
  },

  // ── FASE 10: Realtime remote control via device_commands / device_policies / device_status ──

  async sendCommand(
    deviceUuid: string,
    command: DeviceCommand['command'],
    payload: Record<string, unknown> | null = null
  ): Promise<string> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('enqueue_device_command', {
      p_device_uuid: deviceUuid,
      p_command: command,
      p_payload: payload,
    });
    if (error) throw new DatabaseError(error.message);
    return data as string;
  },

  async lockDevice(deviceUuid: string): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'LOCK');
  },

  async unlockDevice(deviceUuid: string): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'UNLOCK');
  },

  async blockApps(deviceUuid: string, packageNames: string[]): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'BLOCK_APPS', { packages: packageNames });
  },

  async unblockApps(deviceUuid: string, packageNames: string[]): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'UNBLOCK_APPS', { packages: packageNames });
  },

  async requestLocation(deviceUuid: string): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'REQUEST_LOCATION');
  },

  // ── FASE 11: control total desde la raíz del dispositivo ──

  async lockTask(deviceUuid: string, enabled: boolean): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, enabled ? 'LOCK_TASK' : 'UNLOCK_TASK', { enabled });
  },

  async setScreenCapture(deviceUuid: string, disabled: boolean): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'SCREEN_CAPTURE', { disabled });
  },

  async setCamera(deviceUuid: string, disabled: boolean): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'CAMERA', { disabled });
  },

  async hideApps(deviceUuid: string, packageNames: string[]): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'HIDE_APPS', { packages: packageNames });
  },

  async unhideApps(deviceUuid: string, packageNames: string[]): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'UNHIDE_APPS', { packages: packageNames });
  },

  async lockUninstall(
    deviceUuid: string,
    packageNames: string[],
    locked: boolean,
    restrictions?: Record<string, boolean>
  ): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'UNINSTALL_LOCK', {
      packages: packageNames,
      locked,
      restrictions,
    });
  },

  async forceStop(deviceUuid: string, packageNames: string[]): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'FORCE_STOP', { packages: packageNames });
  },

  async wipeDevice(deviceUuid: string): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'WIPE_DEVICE');
  },

  async listApps(deviceUuid: string): Promise<string> {
    return deviceControlService.sendCommand(deviceUuid, 'LIST_APPS');
  },

  async getDeviceApps(deviceUuid: string): Promise<InstalledApp[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('device_status')
      .select('apps')
      .eq('device_uuid', deviceUuid)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    const apps = (data as { apps?: unknown } | null)?.apps;
    if (!Array.isArray(apps)) return [];
    return (apps as { packageName?: string; label?: string }[]).flatMap((a) =>
      typeof a.packageName === 'string'
        ? [{ packageName: a.packageName, label: typeof a.label === 'string' ? a.label : a.packageName }]
        : []
    );
  },

  async syncPolicy(
    deviceUuid: string,
    policy: {
      dailyLimitMinutes?: number | null;
      bedtimeEnabled?: boolean | null;
      bedtimeStart?: string | null;
      bedtimeEnd?: string | null;
      blockedPackages?: string[] | null;
    }
  ): Promise<string> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('upsert_device_policy', {
      p_device_uuid: deviceUuid,
      p_daily_limit_minutes: policy.dailyLimitMinutes ?? null,
      p_bedtime_enabled: policy.bedtimeEnabled ?? null,
      p_bedtime_start: policy.bedtimeStart ?? null,
      p_bedtime_end: policy.bedtimeEnd ?? null,
      p_blocked_packages: policy.blockedPackages ?? null,
    });
    if (error) throw new DatabaseError(error.message);
    // Also emit SET_POLICY command for the device to pick up via Realtime
    try {
      await deviceControlService.sendCommand(deviceUuid, 'SET_POLICY', {
        daily_limit_minutes: policy.dailyLimitMinutes ?? null,
        bedtime_enabled: policy.bedtimeEnabled ?? null,
        bedtime_start: policy.bedtimeStart ?? null,
        bedtime_end: policy.bedtimeEnd ?? null,
        blocked_packages: policy.blockedPackages ?? [],
      });
    } catch {
      // policy is already stored; command failure is non-fatal
    }
    return data as string;
  },

  async getDeviceCommands(deviceUuid: string): Promise<DeviceCommand[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_device_commands_for_device', {
      p_device_uuid: deviceUuid,
    });
    if (error) throw new DatabaseError(error.message);
    return ((data ?? []) as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        deviceUuid: r.device_uuid as string,
        familyId: r.family_id as string,
        childId: r.child_id as string | null,
        command: r.command as DeviceCommand['command'],
        payload: r.payload as Record<string, unknown> | null,
        status: r.status as DeviceCommand['status'],
        createdAt: r.created_at as string,
        executedAt: r.executed_at as string | null,
      };
    });
  },

  async getDevicePolicies(deviceUuid: string): Promise<DevicePolicy | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client.from('device_policies').select('*').eq('device_uuid', deviceUuid).maybeSingle();
    if (error) throw new DatabaseError(error.message);
    if (!data) return null;
    const r = data as Record<string, unknown>;
    return {
      id: r.id as string,
      familyId: r.family_id as string,
      childId: r.child_id as string | null,
      deviceUuid: r.device_uuid as string,
      dailyLimitMinutes: r.daily_limit_minutes as number | null,
      bedtimeEnabled: Boolean(r.bedtime_enabled),
      bedtimeStart: r.bedtime_start as string | null,
      bedtimeEnd: r.bedtime_end as string | null,
      blockedPackages: (r.blocked_packages as string[] | null) ?? [],
      updatedAt: r.updated_at as string,
    };
  },

  async getDeviceStatus(deviceUuid: string): Promise<DeviceStatus | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client.from('device_status').select('*').eq('device_uuid', deviceUuid).maybeSingle();
    if (error) throw new DatabaseError(error.message);
    if (!data) return null;
    const r = data as Record<string, unknown>;
    return {
      deviceUuid: r.device_uuid as string,
      familyId: r.family_id as string | null,
      childId: r.child_id as string | null,
      lastSeen: (r.last_seen as string | null) ?? null,
      battery: (r.battery as number | null) ?? null,
      latitude: (r.latitude as number | null) ?? null,
      longitude: (r.longitude as number | null) ?? null,
      currentApp: (r.current_app as string | null) ?? null,
      isLocked: Boolean(r.is_locked),
      apps: Array.isArray(r.apps) ? (r.apps as InstalledApp[]) : null,
    };
  },
};
