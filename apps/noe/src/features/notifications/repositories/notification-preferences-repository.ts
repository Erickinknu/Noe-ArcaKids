import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

export interface NotificationPreferences {
  pushEnabled: boolean;
  dailyReport: boolean;
  bedtimeAlert: boolean;
  appBlocked: boolean;
  timeLimitReached: boolean;
  deviceOffline: boolean;
  locationAlert: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  pushEnabled: true,
  dailyReport: true,
  bedtimeAlert: false,
  appBlocked: true,
  timeLimitReached: true,
  deviceOffline: true,
  locationAlert: false,
};

interface PrefRow {
  push_enabled: boolean;
  daily_report: boolean;
  bedtime_alert: boolean;
  app_blocked: boolean;
  time_limit_reached: boolean;
  device_offline: boolean;
  location_alert: boolean;
}

function mapRow(row: Partial<PrefRow>): NotificationPreferences {
  return {
    pushEnabled: row.push_enabled ?? DEFAULT_NOTIFICATION_PREFERENCES.pushEnabled,
    dailyReport: row.daily_report ?? DEFAULT_NOTIFICATION_PREFERENCES.dailyReport,
    bedtimeAlert: row.bedtime_alert ?? DEFAULT_NOTIFICATION_PREFERENCES.bedtimeAlert,
    appBlocked: row.app_blocked ?? DEFAULT_NOTIFICATION_PREFERENCES.appBlocked,
    timeLimitReached: row.time_limit_reached ?? DEFAULT_NOTIFICATION_PREFERENCES.timeLimitReached,
    deviceOffline: row.device_offline ?? DEFAULT_NOTIFICATION_PREFERENCES.deviceOffline,
    locationAlert: row.location_alert ?? DEFAULT_NOTIFICATION_PREFERENCES.locationAlert,
  };
}

export const notificationPreferencesRepository = {
  async get(userId: string): Promise<NotificationPreferences | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('notification_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw new DatabaseError(error.message);
    if (!data) return null;
    return mapRow(data as PrefRow);
  },

  async save(userId: string, prefs: NotificationPreferences): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client
      .from('notification_preferences')
      .upsert(
        {
          user_id: userId,
          push_enabled: prefs.pushEnabled,
          daily_report: prefs.dailyReport,
          bedtime_alert: prefs.bedtimeAlert,
          app_blocked: prefs.appBlocked,
          time_limit_reached: prefs.timeLimitReached,
          device_offline: prefs.deviceOffline,
          location_alert: prefs.locationAlert,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (error) throw new DatabaseError(error.message);
  },
};