import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import {
  activityService,
  type AlertItem,
  type DailyUsage,
} from '@/features/activity/services/activity-service';
import { formatDuration } from '@/features/dashboard/services/dashboard-service';
import { useAsyncData } from '@/hooks/use-async-data';
import { colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';

const CHART_HEIGHT = 120;
const BAR_WIDTH = 28;

function getBarColor(minutes: number): string {
  if (minutes < 60) return colors.success;
  if (minutes <= 120) return colors.warning;
  return colors.danger;
}

function formatDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function getAlertIcon(type: AlertItem['type']): string {
  if (type === 'block') return '🚫';
  if (type === 'time') return '⏰';
  return '📍';
}

interface ChildUsageSummary {
  childId: string;
  childName: string;
  totalMinutes: number;
  dailyData: DailyUsage[];
}

interface DailyBar {
  date: string;
  label: string;
  minutes: number;
  color: string;
}

export default function ActivityScreen() {
  const { t: tr } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);
  const fetchUsage = useCallback(() => activityService.getAllChildrenUsage(7), []);
  const fetchAlerts = useCallback(() => activityService.getRecentAlerts(), []);
  const { data: usageData, error: usageError, loading: usageLoading, reload: reloadUsage } = useAsyncData(fetchUsage);
  const { data: alerts, error: alertsError, loading: alertsLoading, reload: reloadAlerts } = useAsyncData(fetchAlerts);

  const loading = usageLoading || alertsLoading;
  const error = usageError || alertsError;
  const onRetry = useCallback(() => { reloadUsage(); reloadAlerts(); }, [reloadUsage, reloadAlerts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([reloadUsage(), reloadAlerts()]).finally(() => setRefreshing(false));
  }, [reloadUsage, reloadAlerts]);

  const childSummaries = useMemo<ChildUsageSummary[]>(() => {
    if (!usageData) return [];
    const grouped = new Map<string, ChildUsageSummary>();
    for (const e of usageData) {
      const s = grouped.get(e.childId);
      if (s) { s.totalMinutes += e.minutes; s.dailyData.push(e); }
      else grouped.set(e.childId, { childId: e.childId, childName: e.childName, totalMinutes: e.minutes, dailyData: [e] });
    }
    return Array.from(grouped.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [usageData]);

  const weeklyBars = useMemo<DailyBar[]>(() => {
    if (!usageData || usageData.length === 0) return [];
    const dayMap = new Map<string, number>();
    for (const e of usageData) dayMap.set(e.reportDate, (dayMap.get(e.reportDate) ?? 0) + e.minutes);
    const bars: DailyBar[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const minutes = dayMap.get(dateStr) ?? 0;
      bars.push({ date: dateStr, label: formatDate(dateStr), minutes, color: getBarColor(minutes) });
    }
    return bars;
  }, [usageData]);

  const maxMinutes = useMemo(() => Math.max(...weeklyBars.map((b) => b.minutes), 1), [weeklyBars]);
  const hasData = childSummaries.length > 0;
  const hasAlerts = alerts && alerts.length > 0;

  if (loading && !usageData && !alerts) return <LoadingState text={tr('noe.activity.loading')} />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={styles.title}>{tr('noe.activity.title')}</Text>
      {!hasData && !hasAlerts ? (
        <EmptyState icon="📊" title={tr('noe.activity.emptyTitle')} description={tr('noe.activity.emptyDescription')} />
      ) : (
        <>
          {hasData && (
            <>
              <SectionHeader title={tr('noe.activity.usagePerChild')} />
              {childSummaries.map((child) => (
                <Card key={child.childId} style={styles.card}>
                  <View style={styles.childRow}>
                    <Avatar name={child.childName} size={40} />
                    <View style={styles.childInfo}>
                      <Text style={styles.childName}>{child.childName}</Text>
                      <Text style={styles.childTotal}>{formatDuration(child.totalMinutes)}</Text>
                    </View>
                  </View>
                </Card>
              ))}
              <SectionHeader title={tr('noe.activity.last7Days')} />
              <Card style={styles.card}>
                <View style={styles.chartContainer}>
                  {weeklyBars.map((bar) => (
                    <View key={bar.date} style={styles.barColumn}>
                      <Text style={styles.barValue}>{bar.minutes > 0 ? formatDuration(bar.minutes) : ''}</Text>
                      <View style={[styles.bar, { height: Math.max((bar.minutes / maxMinutes) * CHART_HEIGHT, 4), backgroundColor: bar.color }]} />
                      <Text style={styles.barLabel}>{bar.label}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          )}
          {hasAlerts && (
            <>
              <SectionHeader title={tr('noe.activity.recentAlerts')} />
              {alerts.map((alert) => (
                <Card key={alert.id} style={styles.card}>
                  <View style={styles.alertRow}>
                    <Text style={styles.alertIcon}>{getAlertIcon(alert.type)}</Text>
                    <View style={styles.alertInfo}>
                      <Text style={styles.alertChild}>{alert.childName}</Text>
                      <Text style={styles.alertMessage}>{alert.message}</Text>
                    </View>
                    <Text style={styles.alertTime}>{formatDate(alert.timestamp)}</Text>
                  </View>
                </Card>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { paddingTop: spacing.xxl, padding: spacing.lg, backgroundColor: colors.background, gap: spacing.md },
  title: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  card: { ...shadows.sm },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  childInfo: { flex: 1 },
  childName: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.semibold, color: colors.text },
  childTotal: { fontSize: typography.fontSizes.body, color: colors.textMuted, marginTop: 2 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_HEIGHT + spacing.xl, paddingTop: spacing.xs },
  barColumn: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 10, color: colors.textMuted, marginBottom: 4 },
  bar: { width: BAR_WIDTH, borderRadius: radius.sm, minHeight: 4 },
  barLabel: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertIcon: { fontSize: 20 },
  alertInfo: { flex: 1 },
  alertChild: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.semibold, color: colors.text },
  alertMessage: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  alertTime: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
});
