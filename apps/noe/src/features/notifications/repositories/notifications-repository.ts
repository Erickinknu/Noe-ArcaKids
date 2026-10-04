import { DatabaseError } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';
import type { Notification, NotificationType } from '@noe-arcakids/types';

export interface NotificationRow {
  id: string;
  family_id: string;
  child_id: string | null;
  user_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

const SELECT_COLUMNS =
  'id, family_id, child_id, user_id, type, title, body, data, is_read, created_at';

export function mapNotificationRow(row: NotificationRow): Notification {
  return {
    id: row.id,
    familyId: row.family_id,
    childId: row.child_id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body ?? '',
    data: row.data ?? {},
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export const notificationsRepository = {
  async getFamilyId(): Promise<string | null> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('families')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (error) throw new DatabaseError(error.message);
    return data?.id ?? null;
  },

  async list(familyId: string, limit = 50): Promise<Notification[]> {
    const client = requireSupabaseClient();
    const { data, error } = await client
      .from('notifications')
      .select(SELECT_COLUMNS)
      .eq('family_id', familyId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new DatabaseError(error.message);
    return ((data ?? []) as NotificationRow[]).map(mapNotificationRow);
  },

  async unreadCount(): Promise<number> {
    const client = requireSupabaseClient();
    const { data, error } = await client.rpc('get_unread_notification_count');
    if (error) throw new DatabaseError(error.message);
    return typeof data === 'number' ? data : 0;
  },

  async markRead(id: string): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('mark_notification_read', { p_id: id });
    if (error) throw new DatabaseError(error.message);
  },

  async markAllRead(): Promise<void> {
    const client = requireSupabaseClient();
    const { error } = await client.rpc('mark_all_notifications_read');
    if (error) throw new DatabaseError(error.message);
  },
};
