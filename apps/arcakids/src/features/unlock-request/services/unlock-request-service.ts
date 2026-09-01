import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { DatabaseError } from '@noe-arcakids/shared';
import { identityService } from '@/features/identity/services/identity-service';
import type { UnlockRequest } from '@noe-arcakids/types';

export const unlockRequestService = {
  async createRequest(reason: string): Promise<UnlockRequest | null> {
    try {
      const childId = await identityService.getChildInfo().then(c => c?.childId);
      if (!childId) return null;

      const client = requireSupabaseClient();
      const { data: family } = await client
        .from('children')
        .select('family_id')
        .eq('id', childId)
        .single();

      if (!family?.family_id) return null;

      const { data, error } = await client
        .from('unlock_requests')
        .insert({
          child_id: childId,
          family_id: family.family_id,
          reason,
        })
        .select('*')
        .single();

      if (error) throw new DatabaseError(error.message);

      return {
        id: data.id,
        childId: data.child_id,
        familyId: data.family_id,
        reason: data.reason,
        status: data.status,
        childName: null,
        createdAt: data.created_at,
        resolvedAt: data.resolved_at,
      };
    } catch (e) {
      console.error('Failed to create unlock request:', e);
      return null;
    }
  },

  async getMyRequests(): Promise<UnlockRequest[]> {
    try {
      const childId = await identityService.getChildInfo().then(c => c?.childId);
      if (!childId) return [];

      const client = requireSupabaseClient();
      const { data, error } = await client
        .from('unlock_requests')
        .select('*')
        .eq('child_id', childId)
        .order('created_at', { ascending: false });

      if (error) throw new DatabaseError(error.message);
      return (data ?? []).map((r: any) => ({
        id: r.id,
        childId: r.child_id,
        familyId: r.family_id,
        reason: r.reason,
        status: r.status,
        childName: null,
        createdAt: r.created_at,
        resolvedAt: r.resolved_at,
      }));
    } catch (e) {
      console.error('Failed to get unlock requests:', e);
      return [];
    }
  },

  subscribeToRequestUpdates(
    childId: string,
    callback: (request: UnlockRequest) => void
  ): () => void {
    const client = requireSupabaseClient();
    const channel = client
      .channel(`unlock-requests-${childId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'unlock_requests',
          filter: `child_id=eq.${childId}`,
        },
        (payload) => {
          const request = payload.new as any;
          callback({
            id: request.id,
            childId: request.child_id,
            familyId: request.family_id,
            reason: request.reason,
            status: request.status,
            childName: null,
            createdAt: request.created_at,
            resolvedAt: request.resolved_at,
          });
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },
};