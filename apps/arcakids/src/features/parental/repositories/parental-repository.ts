import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

import type { DeviceRules, UsageEntry } from '@noe-arcakids/types';

interface DeviceRulesRow {
  child_id: string;
  display_name: string;
  daily_limit_minutes: number | null;
  bedtime_enabled: boolean;
  bedtime_start: string | null;
  bedtime_end: string | null;
  blocked_packages: string[] | null;
}

function mapRules(row: DeviceRulesRow): DeviceRules {
  return {
    childId: row.child_id,
    displayName: row.display_name,
    dailyLimitMinutes: row.daily_limit_minutes,
    bedtimeEnabled: row.bedtime_enabled,
    bedtimeStart: row.bedtime_start ? row.bedtime_start.slice(0, 5) : null,
    bedtimeEnd: row.bedtime_end ? row.bedtime_end.slice(0, 5) : null,
    blockedPackages: row.blocked_packages ?? [],
  };
}

export const parentalRepository = {
  async getRulesForDevice(deviceUuid: string): Promise<DeviceRules | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_child_rules_for_device', {
      p_device_uuid: deviceUuid,
    });

    if (error) {
      throw new DatabaseError(error.message);
    }
    const rows = (data ?? []) as DeviceRulesRow[];
    return rows[0] ? mapRules(rows[0]) : null;
  },

  async reportUsage(
    deviceUuid: string,
    reportDate: string,
    entries: UsageEntry[]
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }
    const client = requireSupabaseClient();
    const { error } = await client.rpc('report_usage_for_device', {
      p_device_uuid: deviceUuid,
      p_report_date: reportDate,
      p_entries: entries.map((entry) => ({
        package: entry.packageName,
        minutes: entry.minutes,
      })),
    });

    if (error) {
      throw new DatabaseError(error.message);
    }
  },
};
