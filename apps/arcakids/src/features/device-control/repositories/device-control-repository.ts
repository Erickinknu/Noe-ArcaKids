import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

import type { DeviceCommand } from '@noe-arcakids/types';

interface CommandRow {
  id: string;
  device_uuid: string;
  family_id: string;
  child_id: string | null;
  command: string;
  payload: Record<string, unknown> | null;
  status: string;
  created_at: string;
  executed_at: string | null;
}

function mapRow(r: CommandRow): DeviceCommand {
  return {
    id: r.id,
    deviceUuid: r.device_uuid,
    familyId: r.family_id,
    childId: r.child_id,
    command: r.command as DeviceCommand['command'],
    payload: r.payload,
    status: r.status as DeviceCommand['status'],
    createdAt: r.created_at,
    executedAt: r.executed_at,
  };
}

export const deviceControlRepository = {
  async getPendingCommands(deviceUuid: string): Promise<DeviceCommand[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_device_commands_for_device', {
      p_device_uuid: deviceUuid,
    });
    if (error) throw new DatabaseError(error.message);
    const rows = (data ?? []) as CommandRow[];
    return rows.map(mapRow);
  },

  async ackCommand(commandId: string, deviceUuid: string, status: 'executed' | 'failed' = 'executed'): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('ack_device_command', {
      p_command_id: commandId,
      p_device_uuid: deviceUuid,
      p_status: status,
    });
    if (error) throw new DatabaseError(error.message);
  },

  async reportStatus(
    deviceUuid: string,
    status: {
      familyId?: string | null;
      childId?: string | null;
      battery?: number | null;
      latitude?: number | null;
      longitude?: number | null;
      currentApp?: string | null;
      isLocked?: boolean;
    }
  ): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('report_device_status', {
      p_device_uuid: deviceUuid,
      p_status: status,
    });
    if (error) throw new DatabaseError(error.message);
  },
};
