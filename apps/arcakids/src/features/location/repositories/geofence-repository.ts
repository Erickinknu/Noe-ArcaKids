import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';
import type { Geofence } from '@noe-arcakids/types';

interface GeofenceRow {
  id: string;
  family_id: string;
  child_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  enabled: boolean;
  created_at: string;
}

function mapGeofence(row: GeofenceRow): Geofence {
  return {
    id: row.id,
    familyId: row.family_id,
    childId: row.child_id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    radius: row.radius,
    enabled: row.enabled,
    createdAt: row.created_at,
  };
}

export const geofenceRepository = {
  async getAll(): Promise<Geofence[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('geofences')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError(error.message);
    }
    return (data ?? []).map(mapGeofence);
  },

  async getByChild(childId: string): Promise<Geofence[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('geofences')
      .select('*')
      .eq('child_id', childId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new DatabaseError(error.message);
    }
    return (data ?? []).map(mapGeofence);
  },

  async create(geofence: Omit<Geofence, 'id' | 'createdAt'>): Promise<Geofence> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('geofences')
      .insert({
        family_id: geofence.familyId,
        child_id: geofence.childId,
        name: geofence.name,
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radius: geofence.radius,
        enabled: geofence.enabled,
      })
      .select()
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }
    return mapGeofence(data);
  },

  async update(id: string, updates: Partial<Geofence>): Promise<Geofence> {
    const client = requireSupabaseClient();
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.latitude !== undefined) updateData.latitude = updates.latitude;
    if (updates.longitude !== undefined) updateData.longitude = updates.longitude;
    if (updates.radius !== undefined) updateData.radius = updates.radius;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

    const { data, error } = await client
      .from('geofences')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new DatabaseError(error.message);
    }
    return mapGeofence(data);
  },

  async delete(id: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.from('geofences').delete().eq('id', id);

    if (error) {
      throw new DatabaseError(error.message);
    }
  },
};