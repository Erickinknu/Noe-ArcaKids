import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

export interface PlanRow {
  slug: string;
  name: string;
  price_cents: number;
  currency: string;
  interval: 'month' | 'year';
  max_children: number | null;
  max_tutors: number;
  max_devices: number;
  features: Record<string, unknown>;
  sort_order: number;
}

export const plansRepository = {
  async listActive(): Promise<PlanRow[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('plans')
      .select(
        'slug,name,price_cents,currency,interval,max_children,max_tutors,max_devices,features,sort_order'
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error) throw new DatabaseError(error.message);
    return (data ?? []) as PlanRow[];
  },
};
