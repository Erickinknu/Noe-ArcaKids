import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { DatabaseError } from '@noe-arcakids/shared';

import type { ChildSummary, FamilySummary } from '../types';

function isOnline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return false;
  const diff = Date.now() - new Date(lastSeenAt).getTime();
  return diff < 5 * 60 * 1000;
}

function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export const dashboardRepository = {
  async getFamilySummary(): Promise<FamilySummary> {
    const client = requireSupabaseClient();

    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new DatabaseError('No authenticated user');

    const { data: family } = await client
      .from('families')
      .select('id, name')
      .limit(1)
      .single();

    if (!family) throw new DatabaseError('No family found');

    const { data: children } = await client
      .from('children')
      .select('id, display_name, avatar_url, created_at')
      .eq('family_id', family.id);

    if (!children || children.length === 0) throw new DatabaseError('No children found');

    const childIds = children.map((c) => c.id);

    const { data: devices } = await client
      .from('devices')
      .select('child_id, last_seen_at')
      .in('child_id', childIds);

    const { data: rules } = await client
      .from('parental_rules')
      .select('child_id, daily_limit_minutes')
      .in('child_id', childIds);

    const today = localToday();
    const { data: usage } = await client
      .from('usage_reports')
      .select('child_id, minutes')
      .in('child_id', childIds)
      .eq('report_date', today);

    const lastSeenMap = new Map<string, string | null>();
    const deviceMap = new Map<string, { last_seen_at: string | null }>();
    for (const d of devices ?? []) {
      deviceMap.set(d.child_id, d);
      if (!lastSeenMap.has(d.child_id) || (d.last_seen_at && lastSeenMap.get(d.child_id)! < d.last_seen_at)) {
        lastSeenMap.set(d.child_id, d.last_seen_at);
      }
    }

    const rulesMap = new Map<string, number | null>();
    for (const r of rules ?? []) {
      rulesMap.set(r.child_id, r.daily_limit_minutes);
    }

    const usageMap = new Map<string, number>();
    for (const u of usage ?? []) {
      const current = usageMap.get(u.child_id) ?? 0;
      usageMap.set(u.child_id, current + u.minutes);
    }

    const childSummaries: ChildSummary[] = children.map((c) => {
      const lastSeen = lastSeenMap.get(c.id) ?? null;
      const dailyLimit = rulesMap.get(c.id) ?? null;
      const minutesToday = usageMap.get(c.id) ?? 0;
      return {
        id: c.id,
        name: c.display_name,
        avatarUrl: c.avatar_url,
        isOnline: isOnline(lastSeen),
        lastSeenAt: lastSeen,
        batteryPercent: null,
        minutesToday,
        dailyLimitMinutes: dailyLimit,
      };
    });

    const connected = childSummaries.filter((c) => c.isOnline).length;
    const totalMinutes = childSummaries.reduce((sum, c) => sum + c.minutesToday, 0);

    return {
      parentName: user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Parent',
      children: childSummaries,
      connectedCount: connected,
      totalChildren: childSummaries.length,
      totalMinutesToday: totalMinutes,
      totalLimitMinutes: null,
      alertsCount: 0,
    };
  },
};
