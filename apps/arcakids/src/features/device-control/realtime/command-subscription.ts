import { requireSupabaseClient } from '@noe-arcakids/supabase';
import type { DeviceCommand } from '@noe-arcakids/types';

/**
 * Realtime command subscription for the child device.
 *
 * INOPERATIVO desde 20260930000000_close_open_select_grants.sql: las tres tablas
 * de eventos ya no conceden SELECT a `anon`, porque `SELECT using(true)` exponia
 * todos los device_uuid a cualquier cliente con la anon key publica. Con el
 * SELECT revocado, `postgres_changes` no entrega nada.
 *
 * No se revierte el revoke. El polling de `remote-control-runner`
 * (`get_device_commands_for_device` cada SYNC_INTERVAL_MS) cubre el hueco, de
 * forma aceptada durante el piloto. Cuando A2 de al child una identidad, estas
 * tres funciones se reemplazan por canales Broadcast privados autorizados por
 * claim, y vuelven a ser push.
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

export function subscribeToStudyMode(
  deviceUuid: string,
  onChange: () => void
): { unsubscribe: () => void } {
  const client = requireSupabaseClient();
  // Inoperativo: `study_mode_events` ya no concede SELECT a `anon`
  // (20260930000000). Cubierto por el polling de `use-device-poller`, que
  // sincroniza reglas cada 15s. Reemplazar por Broadcast privado con A2.
  // Cuando vuelva a funcionar: la fila es una señal por dispositivo sin
  // payload por diseño, asi que el handler debe refetch del schedule por RPC.
  const channel = client
    .channel(`study_mode_events:${deviceUuid}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'study_mode_events',
        filter: `device_uuid=eq.${deviceUuid}`,
      },
      () => {
        onChange();
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
  // Inoperativo: `device_policy_events` ya no concede SELECT a `anon`
  // (20260930000000), y su `SELECT using(true)` exponia device_uuid, family_id,
  // child_id y payload de cualquier familia. Cubierto por `syncRulesEnforcement`
  // cada 15s. Reemplazar por Broadcast privado con A2.
  // Cuando vuelva a funcionar: la fila completa llega en `payload`.
  const channel = client
    .channel(`device_policy_events:${deviceUuid}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'device_policy_events',
        filter: `device_uuid=eq.${deviceUuid}`,
      },
      (payload) => {
        const row = (payload.new ?? {}) as { payload?: Record<string, unknown> };
        onPolicy(row.payload ?? {});
      }
    )
    .subscribe();

  return {
    unsubscribe() {
      void client.removeChannel(channel);
    },
  };
}
