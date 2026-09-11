import { requireSupabaseClient } from '@noe-arcakids/supabase';

export interface DailyUsage {
  childId: string;
  childName: string;
  reportDate: string;
  minutes: number;
}

export interface PackageUsage {
  packageName: string;
  minutes: number;
  appLabel?: string;
}

export interface ChildUsageSummary {
  childId: string;
  childName: string;
  packageUsages: PackageUsage[];
  totalMinutes: number;
}

export type ActivityCategory = 'web' | 'youtube' | 'social' | 'media' | 'conversations' | 'games';

export const CATEGORY_PACKAGES: Record<ActivityCategory, string[]> = {
  web: [
    'com.android.chrome',
    'com.brave.browser',
    'org.mozilla.firefox',
    'com.opera.browser',
    'com.microsoft.emmx',
    'com.duckduckgo.mobile.android',
  ],
  youtube: ['com.google.android.youtube', 'com.google.android.apps.youtube.music'],
  social: [
    'com.instagram.android',
    'com.facebook.katana',
    'com.zhiliaoapp.musically',
    'com.snapchat.android',
    'com.twitter.android',
    'com.linkedin.android',
    'com.pinterest',
    'com.reddit.frontpage',
    'com.twitch.android.app',
    'com.discord',
  ],
  media: [
    'com.google.android.apps.photos',
    'com.android.gallery3d',
    'com.sec.android.gallery3d',
    'com.google.android.youtube',
    'com.netflix.mediaclient',
    'com.spotify.music',
    'com.google.android.apps.maps',
  ],
  conversations: [
    'com.whatsapp',
    'com.google.android.apps.messaging',
    'com.facebook.orca',
    'com.telegram.messenger',
    'com.skype.raider',
    'com.discord',
    'com.slack',
  ],
  games: [],
};

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
    const startDateStr = localDateKey(startDate);

    const childIds = children.map((c) => c.id);
    const childNameMap = new Map(children.map((c) => [c.id, c.display_name]));

    const { data: usage, error } = await client
      .from('usage_reports')
      .select('child_id, minutes, report_date')
      .in('child_id', childIds)
      .gte('report_date', startDateStr)
      .order('report_date', { ascending: false })
      .limit(500);

    if (error) throw error;

    return (usage ?? []).map((u) => ({
      childId: u.child_id,
      childName: childNameMap.get(u.child_id) ?? 'Hijo',
      reportDate: u.report_date,
      minutes: u.minutes,
    }));
  },

  async getChildUsageByPackage(childId: string, days: number = 1): Promise<ChildUsageSummary> {
    const client = requireSupabaseClient();

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = localDateKey(startDate);

    const { data, error } = await client
      .from('usage_reports')
      .select('package_name, minutes, app_label')
      .eq('child_id', childId)
      .gte('report_date', startDateStr)
      .limit(500);

    if (error) throw error;

    const byPackage = new Map<string, { minutes: number; appLabel?: string }>();
    for (const row of data ?? []) {
      const pkg = (row as { package_name?: string | null }).package_name ?? 'Otras apps';
      if (!pkg || pkg.trim().length === 0) continue;
      const entry = byPackage.get(pkg) ?? { minutes: 0 };
      entry.minutes += Number(row.minutes) || 0;
      if (row.app_label && entry.appLabel === undefined) entry.appLabel = row.app_label;
      byPackage.set(pkg, entry);
    }

    const packageUsages = Array.from(byPackage.entries())
      .map(([packageName, { minutes, appLabel }]) => ({
        packageName,
        minutes,
        appLabel: appLabel ?? undefined,
      }))
      .filter((entry) => entry.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);

    // Also get child name
    const { data: child } = await client
      .from('children')
      .select('display_name')
      .eq('id', childId)
      .single();

    return {
      childId,
      childName: child?.display_name ?? 'Hijo',
      packageUsages,
      totalMinutes: packageUsages.reduce((sum, u) => sum + u.minutes, 0),
    };
  },

  /** Fetches usage filtered to a single activity category (web, social, etc). */
  async getChildUsageByCategory(
    childId: string,
    category: ActivityCategory,
    days: number = 7
  ): Promise<ChildUsageSummary> {
    const packages = CATEGORY_PACKAGES[category];
    const summary = await activityService.getChildUsageByPackage(childId, days);

    const filtered = summary.packageUsages.filter((pkg) => packages.includes(pkg.packageName));

    return {
      ...summary,
      packageUsages: filtered,
      totalMinutes: filtered.reduce((sum, u) => sum + u.minutes, 0),
    };
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
      childId: ba.child_id,
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
  childId: string;
  childName: string;
  message: string;
  timestamp: string;
}