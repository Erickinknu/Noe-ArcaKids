import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const pushNotificationService = {
  async requestPermissions(): Promise<boolean> {
    try {
      const settings = await Notifications.getPermissionsAsync();
      if (settings.status === 'granted') return true;
      if (settings.status === 'undetermined') {
        const request = await Notifications.requestPermissionsAsync();
        return request.status === 'granted';
      }
      return false;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return false;
    }
  },

  async getPushToken(): Promise<string | null> {
    try {
      // @ts-ignore - expo-notifications derives projectId from app config
      const { data } = await Notifications.getExpoPushTokenAsync();
      return data ?? null;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  },

  async registerPushToken(): Promise<boolean> {
    try {
      const token = await this.getPushToken();
      if (!token) return false;

      const client = requireSupabaseClient();
      const {
        data: { user },
      } = await client.auth.getUser();
      if (!user) return false;

      const { error } = await client
        .from('push_tokens')
        .upsert(
          { user_id: user.id, token, platform: 'android' },
          { onConflict: 'token' }
        );

      if (error) {
        console.error('Failed to register push token:', error);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error registering push token:', error);
      return false;
    }
  },

  async unregisterPushToken(): Promise<void> {
    try {
      const token = await this.getPushToken();
      if (!token) return;

      const client = requireSupabaseClient();
      await client.from('push_tokens').delete().eq('token', token);
    } catch (error) {
      console.error('Error removing push token:', error);
    }
  },

  async configure(): Promise<() => void> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Alertas NOE',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0A84FF',
      }).catch(() => {});
    }

    const receivedSub = Notifications.addNotificationReceivedListener(() => {});
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        if (data?.type === 'unlock_request') {
          // handled by navigation from the dashboard
        }
      }
    );

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  },
};