import type { BlockedApp, ParentalRules } from '@noe-arcakids/types';
import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

interface ParentalRulesRow {
  id: string;
  family_id: string;
  child_id: string;
  daily_limit_minutes: number | null;
  bedtime_enabled: boolean;
  bedtime_start: string | null;
  bedtime_end: string | null;
  created_at: string;
  updated_at: string;
}

interface BlockedAppRow {
  id: string;
  family_id: string;
  child_id: string;
  package_name: string;
  app_label: string;
  created_at: string;
}

function normalizeTime(value: string | null): string | null {
  return value ? value.slice(0, 5) : null;
}

function mapRulesRow(row: ParentalRulesRow): ParentalRules {
  return {
    id: row.id,
    familyId: row.family_id,
    childId: row.child_id,
    dailyLimitMinutes: row.daily_limit_minutes,
    bedtimeEnabled: row.bedtime_enabled,
    bedtimeStart: normalizeTime(row.bedtime_start),
    bedtimeEnd: normalizeTime(row.bedtime_end),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBlockedAppRow(row: BlockedAppRow): BlockedApp {
  return {
    id: row.id,
    familyId: row.family_id,
    childId: row.child_id,
    packageName: row.package_name,
    appLabel: row.app_label,
    createdAt: row.created_at,
  };
}

export interface ParentalRulesPatch {
  dailyLimitMinutes?: number | null;
  bedtimeEnabled?: boolean;
  bedtimeStart?: string | null;
  bedtimeEnd?: string | null;
}

export const parentalRepository = {
  async getRulesByChild(childId: string): Promise<ParentalRules | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('parental_rules')
      .select('*')
      .eq('child_id', childId)
      .maybeSingle();

    if (error) {
      throw new DatabaseError(error.message);
    }
    return data ? mapRulesRow(data as ParentalRulesRow) : null;
  },

  async upsertRules(
    familyId: string,
    childId: string,
    patch: ParentalRulesPatch
  ): Promise<ParentalRules> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('parental_rules')
      .upsert(
        {
          family_id: familyId,
          child_id: childId,
          daily_limit_minutes: patch.dailyLimitMinutes ?? null,
          bedtime_enabled: patch.bedtimeEnabled ?? false,
          bedtime_start: patch.bedtimeStart ?? null,
          bedtime_end: patch.bedtimeEnd ?? null,
        },
        { onConflict: 'child_id' }
      )
      .select('*')
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }
    return mapRulesRow(data as ParentalRulesRow);
  },

  async listBlockedApps(childId: string): Promise<BlockedApp[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('blocked_apps')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new DatabaseError(error.message);
    }
    return (data ?? []).map((row) => mapBlockedAppRow(row as BlockedAppRow));
  },

  async addBlockedApp(
    familyId: string,
    childId: string,
    packageName: string,
    appLabel: string
  ): Promise<BlockedApp> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('blocked_apps')
      .insert({
        family_id: familyId,
        child_id: childId,
        package_name: packageName,
        app_label: appLabel,
      })
      .select('*')
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }
    return mapBlockedAppRow(data as BlockedAppRow);
  },

  async removeBlockedApp(id: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.from('blocked_apps').delete().eq('id', id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },
};
