import { requireSupabaseClient } from '@noe-arcakids/supabase';
import type { Notification } from '@noe-arcakids/types';

import { notificationsRepository } from '../repositories/notifications-repository';

export const notificationsService = {
  async list(): Promise<Notification[]> {
    const familyId = await notificationsRepository.getFamilyId();
    if (!familyId) return [];
    return notificationsRepository.list(familyId);
  },

  unreadCount(): Promise<number> {
    return notificationsRepository.unreadCount();
  },

  markRead(id: string): Promise<void> {
    return notificationsRepository.markRead(id);
  },

  markAllRead(): Promise<void> {
    return notificationsRepository.markAllRead();
  },

  subscribeToNotifications(onChange: () => void): () => void {
    const client = requireSupabaseClient();
    const channel = client
      .channel('notifications-family')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => onChange()
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  },
};
