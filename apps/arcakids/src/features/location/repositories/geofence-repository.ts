import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

import type { Geofence } from '@/features/location/native/location-module';

interface GeofenceRow {
  id: string;
  child_id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number;
  triggered: boolean;
  triggered_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapGeofence(row: GeofenceRow): Geofence {
  return {
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    radius: row.radius,
    childId: row.child_id,
    triggered: row.triggered,
    triggeredAt: row.triggered_at ? new Date(row.triggered_at).getTime() : undefined,
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

  async create(geofence: Omit<Geofence, 'id' | 'triggered' | 'triggeredAt'>): Promise<Geofence> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('geofences')
      .insert({
        name: geofence.name,
        child_id: geofence.childId,
        latitude: geofence.latitude,
        longitude: geofence.longitude,
        radius: geofence.radius,
        triggered: false,
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
    const { data, error } = await client
      .from('geofences')
      .update({
        name: updates.name,
        latitude: updates.latitude,
        longitude: updates.longitude,
        radius: updates.radius,
        triggered: updates.triggered,
        triggered_at: updates.triggeredAt ? new Date(updates.triggeredAt).toISOString() : null,
      })
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