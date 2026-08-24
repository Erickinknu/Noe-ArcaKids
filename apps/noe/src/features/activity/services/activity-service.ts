import { requireSupabaseClient } from '@noe-arcakids/supabase';

export interface DailyUsage {
  childId: string;
  childName: string;
  reportDate: string;
  minutes: number;
}

export const activityService = {
  async getAllChildrenUsage(days: number = 7): Promise<DailyUsage[]> {
    const client = requireSupabaseClient();

    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    const { data: family } = await client
      .from('families')
      .select('id')
      .limit(1)
      .single();

    if (!family) return [];

    const { data: children } = await client
      .from('children')
      .select('id, display_name')
      .eq('family_id', family.id);

    if (!children || children.length === 0) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const childIds = children.map((c) => c.id);
    const childNameMap = new Map(children.map((c) => [c.id, c.display_name]));

    const { data: usage, error } = await client
      .from('usage_reports')
      .select('child_id, minutes, report_date')
      .in('child_id', childIds)
      .gte('report_date', startDateStr)
      .order('report_date', { ascending: false });

    if (error) throw error;

    return (usage ?? []).map((u) => ({
      childId: u.child_id,
      childName: childNameMap.get(u.child_id) ?? 'Hijo',
      reportDate: u.report_date,
      minutes: u.minutes,
    }));
  },

  async getRecentAlerts(): Promise<AlertItem[]> {
    const client = requireSupabaseClient();

    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    const { data: family } = await client
      .from('families')
      .select('id')
      .limit(1)
      .single();

    if (!family) return [];

    const { data: children } = await client
      .from('children')
      .select('id, display_name')
      .eq('family_id', family.id);

    if (!children || children.length === 0) return [];

    const childIds = children.map((c) => c.id);
    const childNameMap = new Map(children.map((c) => [c.id, c.display_name]));

    const { data: blockedApps } = await client
      .from('blocked_apps')
      .select('child_id, app_label, created_at')
      .in('child_id', childIds)
      .order('created_at', { ascending: false })
      .limit(20);

    const alerts: AlertItem[] = (blockedApps ?? []).map((ba) => ({
      id: ba.created_at + ba.child_id,
      type: 'block' as const,
      childName: childNameMap.get(ba.child_id) ?? 'Hijo',
      message: `${ba.app_label} fue bloqueado`,
      timestamp: ba.created_at,
    }));

    return alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  },
};

export interface AlertItem {
  id: string;
  type: 'block' | 'time' | 'location';
  childName: string;
  message: string;
  timestamp: string;
}
