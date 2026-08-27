import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { DatabaseError } from '@noe-arcakids/shared';

export type AppCategory = 'limited' | 'blocked' | 'free';

export interface ChildApp {
  id: string;
  packageName: string;
  appLabel: string;
  category: AppCategory;
  timeLimitMinutes: number | null;
}

export const appCategoryService = {
  async getCategories(childId: string): Promise<ChildApp[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_app_categories', { p_child_id: childId });
    if (error) throw new DatabaseError(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      packageName: r.package_name,
      appLabel: r.app_label,
      category: r.category,
      timeLimitMinutes: r.time_limit_minutes,
    }));
  },

  async setCategory(
    childId: string,
    packageName: string,
    appLabel: string,
    category: AppCategory,
    timeLimitMinutes?: number
  ): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('upsert_app_category', {
      p_child_id: childId,
      p_package_name: packageName,
      p_app_label: appLabel,
      p_category: category,
      p_time_limit_minutes: timeLimitMinutes ?? null,
    });
    if (error) throw new DatabaseError(error.message);
  },

  async syncApps(
    childId: string,
    apps: { packageName: string; label: string }[]
  ): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('sync_child_apps', {
      p_child_id: childId,
      p_apps: apps,
    });
    if (error) throw new DatabaseError(error.message);
  },

  async bulkSetCategory(
    childId: string,
    packageNames: string[],
    category: AppCategory
  ): Promise<void> {
    const client = requireSupabaseClient();
    for (const pkg of packageNames) {
      const { error } = await client.rpc('upsert_app_category', {
        p_child_id: childId,
        p_package_name: pkg,
        p_app_label: pkg,
        p_category: category,
      });
      if (error) throw new DatabaseError(error.message);
    }
  },
};
