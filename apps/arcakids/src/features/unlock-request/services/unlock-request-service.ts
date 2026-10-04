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

  // Inoperativo hasta que exista credencial de dispositivo (A2).
  //
  // El child app no tiene sesion Supabase: usa la anon key, y `unlock_requests`
  // revocó todos los privilegios a `anon` en 20260830000000_security_hardening.sql
  // (SELECT/INSERT devuelven 401). Por eso la suscripcion postgres_changes nunca
  // llega a entregar eventos: no es un fallo de configuracion del canal, es que
  // la tabla no es legible para este rol.
  //
  // Await: `postgres_changes` requiere que la tabla este en la publication
  // `supabase_realtime` y que el rol tenga SELECT sobre la tabla. Cuando A2 de
  // al child una identidad (auth.uid() mapeado a device_uuid), esta funcion deja
  // de necesitar cambios: RLS sobre `unlock_requests` ya es
  // `for all to authenticated using (is_family_member(family_id))`.
  //
  // No se "arregla" granting SELECT a `anon`: eso reabriria la fuga de
  // exposicion de datos de familia que 20260930000000 acaba de cerrar.
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