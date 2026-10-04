import type { Notification } from '@noe-arcakids/types';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

import {
  mapNotificationRow,
  notificationsRepository,
  type NotificationRow,
} from '../repositories/notifications-repository';
import { notificationsService } from './notifications-service';

jest.mock('@noe-arcakids/supabase', () => ({
  requireSupabaseClient: jest.fn(),
}));

jest.mock('@noe-arcakids/storage', () => ({
  storage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const requireClient = requireSupabaseClient as jest.Mock;

const baseRow: NotificationRow = {
  id: 'n1',
  family_id: 'f1',
  child_id: 'c1',
  user_id: null,
  type: 'sos',
  title: 'Alerta SOS',
  body: null,
  data: null,
  is_read: false,
  created_at: '2026-10-02T10:00:00.000Z',
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('mapNotificationRow', () => {
  it('maps snake_case columns to the camelCase Notification shape', () => {
    expect(mapNotificationRow(baseRow)).toEqual({
      id: 'n1',
      familyId: 'f1',
      childId: 'c1',
      userId: null,
      type: 'sos',
      title: 'Alerta SOS',
      body: '',
      data: {},
      isRead: false,
      createdAt: '2026-10-02T10:00:00.000Z',
    });
  });

  it('preserves body and data when present', () => {
    const mapped = mapNotificationRow({
      ...baseRow,
      body: 'Tu hijo salió de Casa',
      data: { eventType: 'exit' },
      is_read: true,
    });
    expect(mapped.body).toBe('Tu hijo salió de Casa');
    expect(mapped.data).toEqual({ eventType: 'exit' });
    expect(mapped.isRead).toBe(true);
  });
});

describe('notificationsService.list', () => {
  it('returns an empty list when there is no family', async () => {
    jest.spyOn(notificationsRepository, 'getFamilyId').mockResolvedValueOnce(null);
    const listSpy = jest.spyOn(notificationsRepository, 'list');

    await expect(notificationsService.list()).resolves.toEqual([]);
    expect(listSpy).not.toHaveBeenCalled();
  });

  it('lists notifications for the resolved family', async () => {
    const item: Notification = {
      id: 'n1',
      familyId: 'f1',
      childId: null,
      userId: null,
      type: 'system',
      title: 'Aviso',
      body: '',
      data: {},
      isRead: false,
      createdAt: '2026-10-02T10:00:00.000Z',
    };
    jest.spyOn(notificationsRepository, 'getFamilyId').mockResolvedValueOnce('f1');
    jest.spyOn(notificationsRepository, 'list').mockResolvedValueOnce([item]);

    await expect(notificationsService.list()).resolves.toEqual([item]);
  });
});

describe('notificationsService mutations', () => {
  it('delegates markRead and markAllRead to the repository', async () => {
    const markRead = jest.spyOn(notificationsRepository, 'markRead').mockResolvedValueOnce();
    const markAllRead = jest.spyOn(notificationsRepository, 'markAllRead').mockResolvedValueOnce();

    await notificationsService.markRead('n1');
    await notificationsService.markAllRead();

    expect(markRead).toHaveBeenCalledWith('n1');
    expect(markAllRead).toHaveBeenCalledTimes(1);
  });
});

describe('notificationsService.subscribeToNotifications', () => {
  it('subscribes to the notifications table and unsubscribes on cleanup', () => {
    const channel: any = {
      on: jest.fn(() => channel),
      subscribe: jest.fn(() => channel),
    };
    const removeChannel = jest.fn();
    requireClient.mockReturnValue({ channel: jest.fn(() => channel), removeChannel });

    const onChange = jest.fn();
    const unsubscribe = notificationsService.subscribeToNotifications(onChange);

    expect(channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      expect.any(Function)
    );

    unsubscribe();
    expect(removeChannel).toHaveBeenCalledWith(channel);
  });
});
