import { useMemo } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import {
  Card,
  radius,
  spacing,
  typography,
  useTheme,
  type ThemeColors,
  type ThemeShadows,
} from '@noe-arcakids/shared';
import type { Notification, NotificationType } from '@noe-arcakids/types';

import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { relativeTime } from '@/features/dashboard/services/dashboard-service';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';
import { ROUTES } from '@/constants';

const TYPE_ICON: Record<NotificationType, keyof typeof MaterialIcons.glyphMap> = {
  unlock_request: 'lock-open',
  geofence: 'place',
  sos: 'warning',
  offline: 'wifi-off',
  time_goal: 'timer',
  system: 'notifications',
};

export default function NotificationsCenterScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead } =
    useNotifications();

  function accentFor(type: NotificationType): string {
    switch (type) {
      case 'sos':
        return colors.danger;
      case 'offline':
      case 'time_goal':
        return colors.warning;
      case 'geofence':
        return colors.primary;
      case 'unlock_request':
        return colors.success;
      default:
        return colors.textMuted;
    }
  }

  function handlePress(item: Notification) {
    if (!item.isRead) markRead(item.id);
    if (item.childId) {
      router.push({ pathname: '/children/[childId]', params: { childId: item.childId } } as any);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: screenPadding.paddingTop }]}
      >
        <View style={styles.headerRow}>
          <Pressable style={styles.headerLeft} onPress={() => router.replace(ROUTES.profile as any)}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            <Text style={styles.headerTitle}>{tr('noe.notificationCenter.title')}</Text>
            {unreadCount > 0 ? (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount}</Text>
              </View>
            ) : null}
          </Pressable>
          {unreadCount > 0 ? (
            <Pressable onPress={markAllRead} hitSlop={8}>
              <Text style={styles.markAll}>{tr('noe.notificationCenter.markAllRead')}</Text>
            </Pressable>
          ) : null}
        </View>

        {loading ? (
          <LoadingState text={tr('noe.notificationCenter.loading')} />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : notifications.length === 0 ? (
          <Card style={styles.emptyCard}>
            <MaterialIcons name="notifications-none" size={36} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>{tr('noe.notificationCenter.emptyTitle')}</Text>
            <Text style={styles.emptyDescription}>
              {tr('noe.notificationCenter.emptyDescription')}
            </Text>
          </Card>
        ) : (
          notifications.map((item) => {
            const accent = accentFor(item.type);
            return (
              <Pressable
                key={item.id}
                onPress={() => handlePress(item)}
                style={({ pressed }) => [
                  styles.row,
                  !item.isRead && styles.rowUnread,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={[styles.iconBadge, { backgroundColor: accent + '18' }]}>
                  <MaterialIcons name={TYPE_ICON[item.type]} size={20} color={accent} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  {item.body ? <Text style={styles.rowBody}>{item.body}</Text> : null}
                  <Text style={styles.rowMeta}>
                    {tr(`noe.notificationCenter.types.${item.type}`)} · {relativeTime(item.createdAt)}
                  </Text>
                </View>
                {!item.isRead ? <View style={[styles.unreadDot, { backgroundColor: accent }]} /> : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
    },
    headerTitle: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    headerBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: spacing.xs,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerBadgeText: {
      fontSize: 11,
      fontWeight: typography.fontWeights.bold,
      color: colors.onPrimary,
    },
    markAll: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.medium,
      color: colors.primary,
    },
    emptyCard: {
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.xl,
      ...shadows.sm,
    },
    emptyTitle: {
      fontSize: typography.fontSizes.subtitle,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    emptyDescription: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      textAlign: 'center',
      lineHeight: 18,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.background,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      ...shadows.sm,
    },
    rowUnread: {
      borderColor: colors.primary,
    },
    rowPressed: {
      backgroundColor: colors.surfaceHover,
    },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowInfo: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    rowBody: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      lineHeight: 18,
    },
    rowMeta: {
      fontSize: 10.5,
      color: colors.textMuted,
      marginTop: 2,
    },
    unreadDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
    },
  });
