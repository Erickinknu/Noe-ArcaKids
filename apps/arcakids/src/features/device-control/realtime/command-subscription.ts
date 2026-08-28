import { requireSupabaseClient } from '@noe-arcakids/supabase';
import type { DeviceCommand } from '@noe-arcakids/types';

/**
 * Realtime command subscription for the child device.
 *
 * Filters by device_uuid on the device_commands table. The parent inserts a
 * row via enqueue_device_command / upsert_device_policy; Supabase Realtime
 * delivers it here. Fallback polling is available via getPendingCommands RPC.
 *
 * Handled commands: LOCK, UNLOCK, BLOCK_APPS, UNBLOCK_APPS, SET_POLICY, REQUEST_LOCATION
 */

export type CommandHandler = (command: DeviceCommand) => Promise<void> | void;

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
        table: 'device_commands',
        filter: `device_uuid=eq.${deviceUuid}`,
      },
      (payload) => {
        const row = payload.new as {
          id: string;
          device_uuid: string;
          family_id: string;
          child_id: string | null;
          command: string;
          payload: Record<string, unknown> | null;
          status: string;
          created_at: string;
          executed_at: string | null;
        };
        if (row.status !== 'pending') return;
        const cmd: DeviceCommand = {
          id: row.id,
          deviceUuid: row.device_uuid,
          familyId: row.family_id,
          childId: row.child_id,
          command: row.command as DeviceCommand['command'],
          payload: row.payload,
          status: row.status as DeviceCommand['status'],
          createdAt: row.created_at,
          executedAt: row.executed_at,
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
