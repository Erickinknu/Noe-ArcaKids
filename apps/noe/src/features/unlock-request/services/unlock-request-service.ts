import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { DatabaseError } from '@noe-arcakids/shared';

export interface UnlockRequest {
  id: string;
  childId: string;
  childName: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'denied';
  createdAt: string;
}

export const unlockRequestService = {
  async getPendingRequests(): Promise<UnlockRequest[]> {
    const client = requireSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new DatabaseError('No user');

    const { data: family } = await client
      .from('families')
      .select('id')
      .limit(1)
      .single();
    if (!family) throw new DatabaseError('No family');

    const { data, error } = await client
      .from('unlock_requests')
      .select('id, child_id, reason, status, created_at')
      .eq('family_id', family.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (error) throw new DatabaseError(error.message);
    if (!data || data.length === 0) return [];

    const childIds = [...new Set(data.map((r) => r.child_id))];
    const { data: children } = await client
      .from('children')
      .select('id, display_name')
      .in('id', childIds);

    const nameMap = new Map((children ?? []).map((c) => [c.id, c.display_name]));

    return data.map((r) => ({
      id: r.id,
      childId: r.child_id,
      childName: nameMap.get(r.child_id) ?? 'Hijo',
      reason: r.reason,
      status: r.status as UnlockRequest['status'],
      createdAt: r.created_at,
    }));
  },

  async resolveRequest(requestId: string, status: 'approved' | 'denied'): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client
      .from('unlock_requests')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', requestId);
    if (error) throw new DatabaseError(error.message);
  },
};
