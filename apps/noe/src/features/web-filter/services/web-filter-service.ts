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
  },

  async addBlockedSite(childId: string, category: string, site: string): Promise<void> {
    const client = requireSupabaseClient();
    const { data } = await client
      .from('web_filters')
      .select('id, blocked_sites')
      .eq('child_id', childId)
      .eq('category', category)
      .maybeSingle();

    if (data) {
      const sites = [...(data.blocked_sites ?? []), site];
      await client
        .from('web_filters')
        .update({ blocked_sites: sites })
        .eq('id', data.id);
    }
  },

  async removeBlockedSite(childId: string, category: string, site: string): Promise<void> {
    const client = requireSupabaseClient();
    const { data } = await client
      .from('web_filters')
      .select('id, blocked_sites')
      .eq('child_id', childId)
      .eq('category', category)
      .maybeSingle();

    if (data) {
      const sites = (data.blocked_sites ?? []).filter((s: string) => s !== site);
      await client
        .from('web_filters')
        .update({ blocked_sites: sites })
        .eq('id', data.id);
    }
  },
};
