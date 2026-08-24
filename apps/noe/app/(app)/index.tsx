import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

import { StatusDot } from '@/components/ui/status-dot';
import { ProgressBar } from '@/components/ui/progress-bar';
import { ChildCard } from '@/components/ui/child-card';
import { StatCard } from '@/components/ui/stat-card';
import { SectionHeader } from '@/components/ui/section-header';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import {
  errorMessage,
  useNetworkStatus,
} from '@noe-arcakids/shared';
import {
  dashboardService,
  formatDuration,
  relativeTime,
} from '@/features/dashboard/services/dashboard-service';
import type { FamilySummary, ChildSummary } from '@/features/dashboard/types';
import { parentalService } from '@/features/parental/services/parental-service';
import { familyService } from '@/features/family/services/family-service';
import { ROUTES } from '@/constants';
import { colors, radius, spacing, typography, shadows } from '@noe-arcakids/shared';

export default function DashboardScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { isOnline } = useNetworkStatus();
  const [data, setData] = useState<FamilySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);
    try {
      const result = await dashboardService.getFamilySummary();
      setData(result);
      const myFamily = await familyService.getMyFamily().catch(() => null);
      if (myFamily) setFamilyId(myFamily.family.id);
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => fetchData(true), [fetchData]);

  useEffect(() => {
    fetchData();
  }, []);

  if (loading && !data) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('common.loading')} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error} onRetry={fetchData} />
      </View>
    );
  }

  if (!data || data.children.length === 0) {
    return (
      <View style={styles.screen}>
        <EmptyState
          icon={<MaterialIcons name="child-care" size={48} color={colors.primary} />}
          title={tr('noe.dashboard.empty')}
          action={{
            label: tr('noe.dashboard.addChild'),
            onPress: () => router.push(ROUTES.children),
          }}
        />
      </View>
    );
  }

  const totalMinutesToday = dashboardService.getTotalMinutesToday(data.children);
  const connectedCount = dashboardService.getConnectedCount(data.children);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <MaterialIcons name="wifi-off" size={16} color={colors.warning} />
          <Text style={styles.offlineText}>{tr('noe.dashboard.offline')}</Text>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.logo}>NOE</Text>
          <View style={styles.headerTextGroup}>
            <Text style={styles.greeting}>
              {tr('noe.dashboard.greeting', { name: data.parentName })}
            </Text>
            <Text style={styles.subtitle}>{tr('noe.dashboard.subtitle')}</Text>
          </View>
        </View>
        <Pressable style={styles.notificationBell} onPress={() => router.push({ pathname: '/notifications' } as any)}>
          <MaterialIcons name="notifications" size={22} color={colors.text} />
          {data.alertsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{data.alertsCount}</Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.summaryRow}>
        <StatCard
          icon={<MaterialIcons name="wifi" size={24} color={colors.success} />}
          value={`${connectedCount}/${data.totalChildren}`}
          label={tr('noe.dashboard.connected')}
          color={colors.success}
        />
        <StatCard
          icon={<MaterialIcons name="schedule" size={24} color={colors.primary} />}
          value={formatDuration(totalMinutesToday)}
          label={tr('noe.dashboard.totalTime')}
          color={colors.primary}
        />
        <StatCard
          icon={<MaterialIcons name="warning" size={24} color={colors.warning} />}
          value={String(data.alertsCount)}
          label={tr('noe.dashboard.alerts')}
          color={colors.warning}
        />
      </View>

      <SectionHeader title={tr('noe.dashboard.myChildren')} />

      {data.children.map((child) => (
        <ChildCard key={child.id} child={child} familyId={familyId} onAction={fetchData} />
      ))}
    </ScrollView>
  );
}

function ChildCard({ child, familyId, onAction }: { child: ChildSummary; familyId: string | null; onAction: () => void }) {
  const { t: tr } = useTranslation();
  const router = useRouter();

  const handlePause = () => {
    if (!familyId) return;
    Alert.alert(
      tr('noe.dashboard.pauseTitle'),
      tr('noe.dashboard.pauseConfirm', { name: child.name }),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('noe.dashboard.pauseConfirmButton'),
          onPress: async () => {
            try {
              await parentalService.saveRules(familyId, child.id, { dailyLimitMinutes: 0 });
              onAction();
            } catch {
              Alert.alert(tr('noe.dashboard.comingSoon'));
            }
          },
        },
      ],
    );
  };

  const handleBlock = () => {
    if (!familyId) return;
    Alert.alert(
      tr('noe.dashboard.blockTitle'),
      tr('noe.dashboard.blockConfirm', { name: child.name }),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('noe.dashboard.blockConfirmButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await parentalService.saveRules(familyId, child.id, { dailyLimitMinutes: 0 });
              onAction();
            } catch {
              Alert.alert(tr('noe.dashboard.comingSoon'));
            }
          },
        },
      ],
    );
  };

  const handleAddTime = (minutes: number) => {
    if (!familyId) return;
    const currentLimit = child.dailyLimitMinutes ?? 120;
    const newLimit = currentLimit + minutes;
    Alert.alert(
      tr('noe.dashboard.addTimeTitle'),
      tr('noe.dashboard.addTimeConfirm', { name: child.name, minutes }),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('noe.dashboard.addTimeConfirmButton'),
          onPress: async () => {
            try {
              await parentalService.saveRules(familyId, child.id, { dailyLimitMinutes: newLimit });
              onAction();
            } catch {
              Alert.alert(tr('noe.dashboard.comingSoon'));
            }
          },
        },
      ],
    );
  };

  const usageText =
    child.dailyLimitMinutes != null
      ? `${formatDuration(child.minutesToday)} / ${formatDuration(child.dailyLimitMinutes)}`
      : formatDuration(child.minutesToday);

  const getBatteryIcon = () => {
    if (child.batteryPercent == null) return null;
    if (child.batteryPercent <= 20) return 'battery-1-bar';
    if (child.batteryPercent <= 50) return 'battery-3-bar';
    if (child.batteryPercent <= 80) return 'battery-5-bar';
    return 'battery-full';
  };

  const batteryIcon = getBatteryIcon();

  return (
    <View style={[styles.childCard, !child.isOnline && styles.childCardOffline]}>
      <View style={styles.childHeader}>
        <Avatar
          name={child.name}
          emoji={child.avatarUrl ?? undefined}
          size={48}
        />
        <View style={styles.childHeaderInfo}>
          <Text style={styles.childName}>{child.name}</Text>
          <StatusDot
            online={child.isOnline}
            showLabel
            label={
              child.isOnline
                ? tr('noe.dashboard.online')
                : tr('noe.dashboard.offlineChild', {
                    time: relativeTime(child.lastSeenAt),
                  })
            }
          />
        </View>
        {child.batteryPercent != null && batteryIcon && (
          <View style={styles.batteryRow}>
            <MaterialIcons name={batteryIcon as any} size={16} color={colors.textMuted} />
            <Text style={styles.batteryText}>{child.batteryPercent}%</Text>
          </View>
        )}
      </View>

      <View style={styles.childMetrics}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>{tr('noe.dashboard.usedToday')}</Text>
          <Text style={styles.metricValue}>{usageText}</Text>
        </View>
      </View>

      {child.dailyLimitMinutes != null && (
        <ProgressBar
          value={child.minutesToday}
          max={child.dailyLimitMinutes}
          height={6}
        />
      )}

      <View style={styles.childActions}>
        <Pressable style={styles.actionButton} onPress={handlePause}>
          <MaterialIcons name="pause-circle" size={18} color={colors.text} />
          <Text style={styles.actionLabel}>{tr('noe.dashboard.pause')}</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() =>
            Alert.alert(tr('noe.dashboard.addTimeTitle'), '', [
              {
                text: tr('noe.dashboard.addTimeOptions.fifteen'),
                onPress: () => handleAddTime(15),
              },
              {
                text: tr('noe.dashboard.addTimeOptions.thirty'),
                onPress: () => handleAddTime(30),
              },
              {
                text: tr('noe.dashboard.addTimeOptions.sixty'),
                onPress: () => handleAddTime(60),
              },
              { text: tr('common.cancel'), style: 'cancel' },
            ])
          }
        >
          <MaterialIcons name="add-circle" size={18} color={colors.text} />
          <Text style={styles.actionLabel}>{tr('noe.dashboard.addTime')}</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={handleBlock}>
          <MaterialIcons name="block" size={18} color={colors.text} />
          <Text style={styles.actionLabel}>{tr('noe.dashboard.block')}</Text>
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => router.push(ROUTES.activity)}
        >
          <MaterialIcons name="bar-chart" size={18} color={colors.text} />
          <Text style={styles.actionLabel}>{tr('noe.dashboard.viewActivity')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerTextGroup: {
    gap: spacing.xs,
  },
  logo: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
  },
  greeting: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  subtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  notificationBell: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    position: 'relative',
    ...shadows.sm,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.onPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1,
    borderColor: colors.warning,
    gap: spacing.xs,
  },
  offlineText: {
    fontSize: typography.fontSizes.caption,
    color: colors.warning,
    fontWeight: typography.fontWeights.medium,
  },
  childCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
    ...shadows.sm,
  },
  childCardOffline: {
    opacity: 0.6,
  },
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  childHeaderInfo: {
    flex: 1,
    gap: 2,
  },
  childName: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  batteryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  batteryText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  childMetrics: {
    gap: spacing.xs,
  },
  metric: {
    gap: 2,
  },
  metricLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  metricValue: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  childActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    gap: 2,
  },
  actionLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    fontWeight: typography.fontWeights.medium,
  },
});
