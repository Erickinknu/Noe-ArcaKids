import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  notificationPreferencesRepository,
  type NotificationPreferences,
} from '../repositories/notification-preferences-repository';

export const notificationPreferencesService = {
  async getPreferences(): Promise<NotificationPreferences> {
    const client = requireSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) return DEFAULT_NOTIFICATION_PREFERENCES;

    const prefs = await notificationPreferencesRepository.get(user.id);
    return prefs ?? DEFAULT_NOTIFICATION_PREFERENCES;
  },

  async updatePreferences(patch: Partial<NotificationPreferences>): Promise<void> {
    const client = requireSupabaseClient();
    const { data: { user } } = await client.auth.getUser();
    if (!user) throw new DatabaseError('No user');

    const current = (await notificationPreferencesRepository.get(user.id)) ?? DEFAULT_NOTIFICATION_PREFERENCES;
    await notificationPreferencesRepository.save(user.id, { ...current, ...patch });
  },
};