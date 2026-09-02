import * as Notifications from 'expo-notifications';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

export enum NotificationType {
  GEOFENCE_ENTER = 'geofence_enter',
  GEOFENCE_EXIT = 'geofence_exit',
  DAILY_LIMIT = 'daily_limit',
  BEDTIME = 'bedtime',
  APP_BLOCKED = 'app_blocked',
}

export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
  type?: NotificationType;
}

export class NotificationService {
  private readonly NOTIFICATION_ID_PREFIX = 'aracakids_';

  /** Check current notification permissions for Android or iOS. */
  async requestPermissions(): Promise<{ granted: boolean }> {
    const { status } = await Notifications.getPermissionsAsync();
    return { granted: status === 'granted' };
  }

  /** Get the Expo push token for this device. */
  async getPushToken(): Promise<string | null> {
    try {
      // @ts-ignore
      const { data } = await Notifications.getExpoPushTokenAsync();
      return data;
    } catch (e) {
      console.error('Failed to get push token:', e);
      return null;
    }
  }

  /** Register push token with Supabase. */
  async registerPushToken(): Promise<boolean> {
    try {
      const token = await this.getPushToken();
      if (!token) return false;

      const client = requireSupabaseClient();
      const { data: { user } } = await client.auth.getUser();
      if (!user) return false;

      const { error } = await client
        .from('push_tokens')
        .upsert({
          user_id: user.id,
          token,
          platform: 'android',
        }, { onConflict: 'token' });

      if (error) {
        console.error('Failed to register push token:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Error registering push token:', e);
      return false;
    }
  }

  /** Schedule a notification with the given content. */
  async scheduleNotification(
    content: Omit<NotificationContent, 'type'>
  ): Promise<string> {
    const { granted } = await this.requestPermissions();
    if (!granted) {
      throw new Error('Notification permissions not granted');
    }

    const { title, body, data } = content;

    // @ts-ignore - expo-notifications input type
    const notification: any = {
      content: {
        title,
        body,
        data: {
          type: data?.type ?? NotificationType.GEOFENCE_ENTER,
          ...(data ?? {}),
        },
        sound: 'default',
      },
      trigger: undefined,
    };

    // @ts-ignore
    return Notifications.scheduleNotificationAsync(notification);
  }

  async scheduleGeofenceEnterNotification(
    geofenceName: string,
    childName: string
  ): Promise<string> {
    return this.scheduleNotification({
      title: 'Llegada a zona',
      body: `${childName} ha entrado a ${geofenceName}`,
    });
  }

  async scheduleGeofenceExitNotification(
    geofenceName: string,
    childName: string
  ): Promise<string> {
    return this.scheduleNotification({
      title: 'Salida de zona',
      body: `${childName} ha salido de ${geofenceName}`,
    });
  }

  async scheduleDailyLimitNotification(
    childName: string,
    usedMinutes: number,
    limitMinutes: number
  ): Promise<string> {
    const percentUsed =
      limitMinutes > 0 ? Math.round((usedMinutes / limitMinutes) * 100) : 100;
    return this.scheduleNotification({
      title: 'Límite de uso diario',
      body: `${childName} ha usado ${usedMinutes} min de ${limitMinutes} min (${percentUsed}%)`,
    });
  }

  async scheduleBedtimeNotification(
    childName: string,
    bedtime: string
  ): Promise<string> {
    return this.scheduleNotification({
      title: 'Hora de dormir',
      body: `Es hora de dormir, ${childName}`,
    });
  }

  async cancelAllScheduledNotifications(): Promise<void> {
    // @ts-ignore
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  async cancelScheduledNotification(id: string): Promise<void> {
    // @ts-ignore
    await Notifications.cancelScheduledNotificationAsync(id);
  }
}

export const notificationService = new NotificationService();