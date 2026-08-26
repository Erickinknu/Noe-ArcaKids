import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { DatabaseError } from '@noe-arcakids/shared';

export interface Geofence {
  id: string;
  familyId: string;
  childId: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  enabled: boolean;
  createdAt: string;
}

export const geofencingService = {
  async listGeofences(): Promise<Geofence[]> {
    const client = requireSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return [];

    const { data: family } = await client
      .from('families')
      .select('id')
      .limit(1)
      .single();
    if (!family) return [];

    const { data, error } = await client
      .from('geofences')
      .select('*')
      .eq('family_id', family.id)
      .order('created_at', { ascending: false });

    if (error) throw new DatabaseError(error.message);
    return (data ?? []).map((r: any) => ({
      id: r.id,
      familyId: r.family_id,
      childId: r.child_id,
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      radius: r.radius,
      enabled: r.enabled,
      createdAt: r.created_at,
    }));
  },

  async addGeofence(
    childId: string,
    name: string,
    lat: number,
    lng: number,
    radius: number
  ): Promise<Geofence> {
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
      .from('geofences')
      .insert({
        family_id: family.id,
        child_id: childId,
        name,
        latitude: lat,
        longitude: lng,
        radius,
      })
      .select('*')
      .single();

    if (error) throw new DatabaseError(error.message);
    return {
      id: data.id,
      familyId: data.family_id,
      childId: data.child_id,
      name: data.name,
      latitude: data.latitude,
      longitude: data.longitude,
      radius: data.radius,
      enabled: data.enabled,
      createdAt: data.created_at,
    };
  },

  async toggleGeofence(id: string, enabled: boolean): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client
      .from('geofences')
      .update({ enabled })
      .eq('id', id);
    if (error) throw new DatabaseError(error.message);
  },

  async removeGeofence(id: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.from('geofences').delete().eq('id', id);
    if (error) throw new DatabaseError(error.message);
  },
};
