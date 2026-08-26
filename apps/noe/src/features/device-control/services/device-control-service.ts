import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { DatabaseError } from '@noe-arcakids/shared';

export interface DeviceState {
  childId: string;
  isBlocked: boolean;
  alertActive: boolean;
  alertStartedAt: string | null;
}

export interface ChildLocation {
  childId: string;
  displayName: string;
  avatarUrl: string | null;
  latitude: number;
  longitude: number;
  locationUpdatedAt: string | null;
  isOnline: boolean;
}

export const deviceControlService = {
  async blockChild(childId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('set_device_blocked', {
      p_child_id: childId,
      p_blocked: true,
    });
    if (error) throw new DatabaseError(error.message);
  },

  async unblockChild(childId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('set_device_blocked', {
      p_child_id: childId,
      p_blocked: false,
    });
    if (error) throw new DatabaseError(error.message);
  },

  async triggerAlert(childId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('trigger_device_alert', {
      p_child_id: childId,
    });
    if (error) throw new DatabaseError(error.message);
  },

  async dismissAlert(childId: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('dismiss_device_alert', {
      p_child_id: childId,
    });
    if (error) throw new DatabaseError(error.message);
  },

  async getDeviceState(childId: string): Promise<DeviceState | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_device_state', {
      p_child_id: childId,
    });
    if (error) throw new DatabaseError(error.message);
    const row = (data as any[])?.[0];
    if (!row) return null;
    return {
      childId,
      isBlocked: row.is_blocked,
      alertActive: row.alert_active,
      alertStartedAt: row.alert_started_at,
    };
  },

  async getChildrenLocations(): Promise<ChildLocation[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_children_locations');
    if (error) throw new DatabaseError(error.message);
    return (data ?? []).map((row: any) => ({
      childId: row.child_id,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      latitude: row.latitude,
      longitude: row.longitude,
      locationUpdatedAt: row.location_updated_at,
      isOnline: row.is_online,
    }));
  },
};
