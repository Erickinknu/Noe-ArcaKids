import { requireSupabaseClient } from '@noe-arcakids/supabase';

export interface WebVisit {
  hostname: string;
  blocked: boolean;
  visitedAt: string;
}

/**
 * Sitios web visitados por un hijo (Internet Seguro / Parte B1+B2). Los dominios
 * los reporta ARCA KIDS a través del filtrado web (report_web_visit); aquí los
 * consume NOE por hijo para mostrar el historial de sitios visitados.
 */
export const webVisitsService = {
  async getChildWebVisits(childId: string, days: number = 7): Promise<WebVisit[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_child_web_visits', {
      p_child_id: childId,
      p_days: days,
    });
    if (error) throw error;
    return ((data ?? []) as { hostname: string; blocked: boolean; visited_at: string }[]).map(
      (row) => ({
        hostname: row.hostname,
        blocked: row.blocked,
        visitedAt: row.visited_at,
      })
    );
  },
};