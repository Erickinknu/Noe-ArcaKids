import { useCallback, useEffect, useState } from 'react';

import { errorMessage } from '@noe-arcakids/shared';
import type { Notification } from '@noe-arcakids/types';

import { notificationsService } from '../services/notifications-service';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [list, count] = await Promise.all([
        notificationsService.list(),
        notificationsService.unreadCount(),
      ]);
      setNotifications(list);
      setUnreadCount(count);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (!active) return;
      await refresh();
    };
    run();
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    const unsubscribe = notificationsService.subscribeToNotifications(() => {
      refresh();
    });
    return unsubscribe;
  }, [refresh]);

  const markRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
      );
      try {
        await notificationsService.markRead(id);
      } finally {
        await refresh();
      }
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    setUnreadCount(0);
    try {
      await notificationsService.markAllRead();
    } finally {
      await refresh();
    }
  }, [refresh]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  };
}

export function useUnreadNotificationCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const load = () => {
      notificationsService
        .unreadCount()
        .then((value) => {
          if (active) setCount(value);
        })
        .catch(() => {});
    };
    load();
    const unsubscribe = notificationsService.subscribeToNotifications(load);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return count;
}
