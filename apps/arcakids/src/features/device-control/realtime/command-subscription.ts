import { requireSupabaseClient } from '@noe-arcakids/supabase';
import type { DeviceCommand } from '@noe-arcakids/types';

/**
 * Realtime command subscription for the child device.
 *
 * Listens to `device_command_events`, a broadcast-only table fed by a trigger
 * on `device_commands`. The source table keeps RLS closed to `anon`; the
 * broadcast table is grant-only (SELECT to anon) so `postgres_changes` can
 * deliver INSERT events to the child app filtered by `device_uuid=eq.<uuid>`.
 * Fallback: `getPendingCommands` RPC polling (see remote-control-runner).
 *
 * Handled commands: LOCK, UNLOCK, BLOCK_APPS, UNBLOCK_APPS, SET_POLICY,
 * REQUEST_LOCATION, LOCK_TASK, UNLOCK_TASK, SCREEN_CAPTURE, CAMERA,
 * HIDE_APPS, UNHIDE_APPS, UNINSTALL_LOCK, FORCE_STOP, WIPE_DEVICE, LIST_APPS
 */

export type CommandHandler = (command: DeviceCommand) => Promise<void> | void;

interface BroadcastEventRow {
  id: string;
  device_uuid: string;
  family_id: string | null;
  command: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export function subscribeToCommands(
  deviceUuid: string,
  handler: CommandHandler
): { unsubscribe: () => void } {
  const client = requireSupabaseClient();

  const channel = client
    .channel(`device_commands:${deviceUuid}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'device_command_events',
        filter: `device_uuid=eq.${deviceUuid}`,
      },
      (payload) => {
        const row = payload.new as BroadcastEventRow;
        const cmd: DeviceCommand = {
          id: row.id,
          deviceUuid: row.device_uuid,
          familyId: row.family_id ?? '',
          childId: null,
          command: row.command as DeviceCommand['command'],
          payload: row.payload,
          status: 'pending',
          createdAt: row.created_at,
          executedAt: null,
        };
        void Promise.resolve(handler(cmd)).catch(() => undefined);
      }
    )
    .subscribe();

  return {
    unsubscribe() {
      void client.removeChannel(channel);
    },
  };
}

export function subscribeToPolicy(
  deviceUuid: string,
  onPolicy: (policy: Record<string, unknown>) => void
): { unsubscribe: () => void } {
  const client = requireSupabaseClient();
  const channel = client
    .channel(`device_policies:${deviceUuid}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'device_policies',
        filter: `device_uuid=eq.${deviceUuid}`,
      },
      (payload) => {
        const row = (payload.new ?? payload.old) as Record<string, unknown>;
        onPolicy(row);
      }
    )
    .subscribe();

  return {
    unsubscribe() {
      void client.removeChannel(channel);
    },
  };
}
