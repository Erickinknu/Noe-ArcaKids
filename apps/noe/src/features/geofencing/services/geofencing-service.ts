import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { DatabaseError } from '@noe-arcakids/shared';
import type { Geofence, GeofenceEvent } from '@noe-arcakids/types';

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

  async checkGeofences(
    childId: string,
    latitude: number,
    longitude: number
  ): Promise<GeofenceEvent[]> {
    const client = requireSupabaseClient();
    const { data: geofences, error } = await client
      .from('geofences')
      .select('*')
      .eq('child_id', childId)
      .eq('enabled', true);

    if (error) throw new DatabaseError(error.message);
    if (!geofences || geofences.length === 0) return [];

    const events: GeofenceEvent[] = [];
    const now = new Date().toISOString();

    for (const g of geofences) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        g.latitude,
        g.longitude
      );
      const isInside = distance <= g.radius;

      events.push({
        geofenceId: g.id,
        childId,
        type: isInside ? 'enter' : 'exit',
        timestamp: now,
        latitude,
        longitude,
      });
    }
    return events;
  },

  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371000;
    const toRad = (deg: number) => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },
};
