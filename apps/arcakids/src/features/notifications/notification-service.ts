import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { locationService } from '@/features/location';
import { identityService } from '@/features/identity/services/identity-service';
import { parentalService } from '@/features/parental/services/parental-service';

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

  constructor() {
    // Listeners set up optionally.
  }

  /** Request notification permissions for Android or iOS. */
  async requestPermissions(): Promise<{ granted: boolean }> {
    // @ts-ignore - expo-notifications API may vary by version
    let getPermissions;
    if (Platform.OS === 'android') {
      // @ts-ignore
      getPermissions = Notifications.getNotificationPermissionsAsync;
    } else {
      // @ts-ignore
      getPermissions = Notifications.getNotificationPermissionsAsync;
    }
    const { status } = await getPermissions();
    const granted = status === 'granted';
    return { granted };
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
    const percentUsed = Math.round((usedMinutes / limitMinutes) * 100);
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