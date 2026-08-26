import * as Notifications from 'expo-notifications';
import { requireSupabaseClient } from '@noe-arcakids/supabase';
import { Platform } from 'react-native';

export const notificationService = {
  async requestPermission(): Promise<boolean> {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  },

  async registerToken(): Promise<void> {
    const granted = await this.requestPermission();
    if (!granted) return;

    const token = await Notifications.getExpoPushTokenAsync();
    const client = requireSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    await client.from('push_tokens').upsert(
      {
        user_id: user.id,
        token: token.data,
        platform: Platform.OS,
      },
      { onConflict: 'token' }
    );
  },

  async sendToFamily(title: string, body: string): Promise<void> {
    const client = requireSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return;

    const { data: family } = await client
      .from('families')
      .select('id')
      .limit(1)
      .single();
    if (!family) return;

    const { data: profiles } = await client
      .from('profiles')
      .select('user_id')
      .eq('family_id', family.id)
      .eq('role', 'parent')
      .neq('user_id', user.id);

    if (!profiles || profiles.length === 0) return;

    const userIds = profiles.map((p: any) => p.user_id);
    const { data: tokens } = await client
      .from('push_tokens')
      .select('token')
      .in('user_id', userIds);

    if (!tokens || tokens.length === 0) return;

    for (const t of tokens) {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: t.token,
          title,
          body,
          sound: true,
        }),
      });
    }
  },
};
