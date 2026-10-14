import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import {
  spacing,
  typography,
  useTheme,
  type ThemeColors,
} from '@noe-arcakids/shared';
import type { Notification, NotificationType } from '@noe-arcakids/types';

import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { relativeTime } from '@/features/dashboard/services/dashboard-service';
import { useNotifications } from '@/features/notifications/hooks/use-notifications';

const ALERT_TYPES: NotificationType[] = ['sos', 'geofence'];

const TYPE_ICON: Record<NotificationType, keyof typeof MaterialIcons.glyphMap> = {
  unlock_request: 'lock-open',
  geofence: 'place',
  sos: 'warning',
  offline: 'wifi-off',
  time_goal: 'timer',
  system: 'notifications',
};

export default function AlertasScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { notifications, loading, error, refresh, markRead } = useNotifications();

  const alerts = useMemo(
    () => notifications.filter((n) => ALERT_TYPES.includes(n.type)),
    [notifications],
  );

  function accentFor(type: NotificationType): string {
    return type === 'sos' ? colors.danger : colors.primary;
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('noe.home.alertsTitle')}
            hitSlop={8}
            style={styles.headerLeft}
            onPress={() => router.back()}
          >
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            <Text style={styles.headerTitle}>{tr('noe.home.alertsTitle')}</Text>
          </Pressable>
        </View>

        {loading ? (
          <LoadingState text={tr('noe.home.alertsLoading')} />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={<MaterialIcons name="check-circle" size={48} color={colors.success} />}
            title={tr('noe.home.alertsEmptyTitle')}
            description={tr('noe.home.alertsEmptyDesc')}
          />
        ) : (
          alerts.map((item) => {
            const accent = accentFor(item.type);
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => handlePress(item)}
                style={({ pressed }) => [
                  styles.row,
                  !item.isRead && styles.rowUnread,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={[styles.iconBadge, { backgroundColor: `${accent}18` }]}>
                  <MaterialIcons name={TYPE_ICON[item.type]} size={20} color={accent} />
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  {item.body ? <Text style={styles.rowBody}>{item.body}</Text> : null}
                  <Text style={styles.rowMeta}>
                    {tr(`noe.notificationCenter.types.${item.type}`)} ·{' '}
                    {relativeTime(item.createdAt)}
                  </Text>
                </View>
                {!item.isRead ? (
                  <View style={[styles.unreadDot, { backgroundColor: accent }]} />
                ) : null}
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: spacing.xl,
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
      minHeight: 48,
    },
    headerTitle: {
      fontFamily: typography.fontFamily.heading,
      fontSize: 20,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
    },
    rowUnread: {
      borderColor: colors.primary,
    },
    rowPressed: {
      opacity: 0.85,
    },
    iconBadge: {
      width: 40,
      height: 40,
      borderRadius: 20,
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
      color: colors.textSoft,
      lineHeight: 18,
    },
    rowMeta: {
      fontSize: 11,
      color: colors.textMuted,
      marginTop: 2,
    },
    unreadDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
    },
  });
