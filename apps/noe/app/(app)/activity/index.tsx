import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { WeeklyChart } from '@/components/ui/weekly-chart';
import { activityService, AlertItem, DailyUsage } from '@/features/activity/services/activity-service';
import { useAsyncData } from '@/hooks/use-async-data';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, spacing, typography, shadows } from '@noe-arcakids/shared';

interface DailyBar {
  date: string;
  label: string;
  minutes: number;
  color: string;
}

interface ChildUsageSummary {
  childId: string;
  childName: string;
  totalMinutes: number;
  dailyData: DailyUsage[];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function getBarColor(minutes: number): string {
  if (minutes < 60) return colors.success;
  if (minutes <= 120) return colors.warning;
  return colors.danger;
}

function getAlertIcon(type: AlertItem['type']): string {
  if (type === 'block') return '🚫';
  if (type === 'time') return '⏰';
  return '📍';
}

export default function ActivityScreen() {
  const { t: tr } = useTranslation();
  const screenPadding = useScreenPadding();
  const [refreshing, setRefreshing] = useState(false);
  const fetchUsage = useCallback(() => activityService.getAllChildrenUsage(7), []);
  const fetchAlerts = useCallback(() => activityService.getRecentAlerts(), []);
  const { data: usageData, error: usageError, loading: usageLoading, reload: reloadUsage } = useAsyncData<DailyUsage[]>(fetchUsage);
  const { data: alerts, error: alertsError, loading: alertsLoading, reload: reloadAlerts } = useAsyncData<AlertItem[]>(fetchAlerts);

  const loading = usageLoading || alertsLoading;
  const error = usageError || alertsError;
  const onRetry = useCallback(() => { reloadUsage(); reloadAlerts(); }, [reloadUsage, reloadAlerts]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([reloadUsage(), reloadAlerts()]).finally(() => setRefreshing(false));
  }, [reloadUsage, reloadAlerts]);

  const childSummaries = useMemo(() => {
    if (!usageData) return [];
    const grouped = new Map<string, ChildUsageSummary>();
    for (const e of usageData) {
      const s = grouped.get(e.childId);
      if (s) { s.totalMinutes += e.minutes; s.dailyData.push(e); }
      else grouped.set(e.childId, { childId: e.childId, childName: e.childName, totalMinutes: e.minutes, dailyData: [e] });
    }
    return Array.from(grouped.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [usageData]);

  const weeklyBars = useMemo(() => {
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
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]} keyboardShouldPersistTaps="handled"
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
              <WeeklyChart
                childSummaries={childSummaries}
                weeklyBars={weeklyBars}
                maxMinutes={maxMinutes}
              />
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
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertIcon: { fontSize: 20 },
  alertInfo: { flex: 1 },
  alertChild: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.semibold, color: colors.text },
  alertMessage: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  alertTime: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
});