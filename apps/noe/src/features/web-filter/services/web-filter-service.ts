import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { DatabaseError } from '@noe-arcakids/shared';

export const CATEGORIES = [
  { id: 'social', label: 'Redes sociales', icon: 'people' as const },
  { id: 'gaming', label: 'Juegos', icon: 'sports-esports' as const },
  { id: 'adult', label: 'Contenido adulto', icon: 'block' as const },
  { id: 'violence', label: 'Violencia', icon: 'warning' as const },
  { id: 'gambling', label: 'Apuestas', icon: 'casino' as const },
  { id: 'drugs', label: 'Drogas', icon: 'medication' as const },
];

// B2: without content-level filtering, "web filtering" blocks the browser apps
// themselves. These are enforced through the existing blocked_apps mechanism.
export const BROWSER_PACKAGES: { packageName: string; label: string }[] = [
  { packageName: 'com.android.chrome', label: 'Chrome' },
  { packageName: 'com.brave.browser', label: 'Brave' },
  { packageName: 'org.mozilla.firefox', label: 'Firefox' },
  { packageName: 'com.opera.browser', label: 'Opera' },
  { packageName: 'com.microsoft.emmx', label: 'Edge' },
  { packageName: 'com.duckduckgo.mobile.android', label: 'DuckDuckGo' },
];

const BROWSER_BLOCK_LABEL_PREFIX = 'Filtrado web:';

async function reconcileBrowserBlocks(childId: string): Promise<void> {
  const client = requireSupabaseClient();
  const filters = await webFilterService.getFilters(childId);
  const anyEnabled = filters.some((f) => f.enabled);
  const packages = BROWSER_PACKAGES.map((b) => b.packageName);

  if (anyEnabled) {
    const { data: family } = await client
      .from('families')
      .select('id')
      .limit(1)
      .single();
    if (!family) return;

    const { data: existing } = await client
      .from('blocked_apps')
      .select('package_name')
      .eq('child_id', childId)
      .in('package_name', packages);
    const existingNames = new Set((existing ?? []).map((r: any) => r.package_name));

    for (const browser of BROWSER_PACKAGES) {
      if (existingNames.has(browser.packageName)) continue;
      await client.from('blocked_apps').insert({
        family_id: family.id,
        child_id: childId,
        package_name: browser.packageName,
        app_label: `${BROWSER_BLOCK_LABEL_PREFIX} ${browser.label}`,
      });
    }
  } else {
    // Only remove the browser blocks this feature created; manual blocks
    // created by the parent are left untouched.
    await client
      .from('blocked_apps')
      .delete()
      .eq('child_id', childId)
      .in('package_name', packages)
      .like('app_label', `${BROWSER_BLOCK_LABEL_PREFIX}%`);
  }
}

export interface WebFilter {
  id: string;
  category: string;
  blockedSites: string[];
  enabled: boolean;
}

export const webFilterService = {
  async getFilters(childId: string): Promise<WebFilter[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('web_filters')
      .select('*')
      .eq('child_id', childId)
      .order('created_at');
    if (error) throw new DatabaseError(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      category: r.category,
      blockedSites: r.blocked_sites ?? [],
      enabled: r.enabled,
    }));
  },

  async toggleCategory(childId: string, category: string, enabled: boolean): Promise<void> {
    const client = requireSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new DatabaseError('No user');

    const { data: family } = await client
      .from('families')
      .select('id')
      .limit(1)
      .single();
    if (!family) throw new DatabaseError('No family');

    const existing = await client
      .from('web_filters')
      .select('id')
      .eq('child_id', childId)
      .eq('category', category)
      .maybeSingle();

    if (existing.data) {
      await client
        .from('web_filters')
        .update({ enabled })
        .eq('id', existing.data.id);
    } else if (enabled) {
      await client.from('web_filters').insert({
        family_id: family.id,
        child_id: childId,
        category,
        enabled: true,
      });
    }

    await reconcileBrowserBlocks(childId);
  },
};
