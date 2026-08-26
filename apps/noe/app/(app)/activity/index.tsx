import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { WeeklyChart } from '@/components/ui/weekly-chart';
import { activityService, AlertItem, DailyUsage } from '@/features/activity/services/activity-service';
import { useAsyncData } from '@/hooks/use-async-data';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { colors, radius, spacing, typography, shadows } from '@noe-arcakids/shared';

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

const INITIAL_APP_USAGE = [
  { name: 'TikTok', minutes: 95, color: '#000000' },
  { name: 'YouTube', minutes: 72, color: '#FF0000' },
  { name: 'Instagram', minutes: 48, color: '#E1306C' },
  { name: 'WhatsApp', minutes: 35, color: '#25D366' },
  { name: 'Roblox', minutes: 28, color: '#E2231A' },
  { name: 'Chrome', minutes: 15, color: '#4285F4' },
];

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
  const router = useRouter();
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
      <View style={styles.titleRow}>
        <Text style={styles.title}>{tr('noe.activity.title')}</Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>En vivo</Text>
        </View>
      </View>

      {/* ── Monitoreo ── */}
      <Text style={styles.sectionLabel}>Monitoreo detallado</Text>
      <View style={styles.monitorGrid}>
        {[
          { icon: 'language' as const, title: 'Páginas\nweb', color: '#6366F1', path: '/activity/web' },
          { icon: 'play-circle' as const, title: 'YouTube\nvideos', color: '#DC2626', path: '/activity/youtube' },
          { icon: 'apps' as const, title: 'Apps\ninstaladas', color: '#D97706', path: '/activity/apps' },
          { icon: 'people' as const, title: 'Redes\nsociales', color: '#E1306C', path: '/activity/social' },
          { icon: 'photo-library' as const, title: 'Imágenes\nrecibidas', color: '#059669', path: '/activity/media' },
          { icon: 'chat' as const, title: 'Conversa-\nciones', color: '#25D366', path: '/activity/conversations' },
        ].map((item) => (
          <Pressable
            key={item.title}
            style={({ pressed }) => [styles.monitorCard, pressed && styles.monitorCardPressed]}
            onPress={() => router.push(item.path as any)}
          >
            <View style={[styles.monitorIcon, { backgroundColor: item.color + '18' }]}>
              <MaterialIcons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={styles.monitorTitle}>{item.title}</Text>
          </Pressable>
        ))}
      </View>
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

          {/* ── App usage breakdown ── */}
          <SectionHeader title="Uso por app (hoy)" />
          <Card style={styles.card}>
            {INITIAL_APP_USAGE.map((app, i) => (
              <View key={app.name} style={[styles.appRow, i < INITIAL_APP_USAGE.length - 1 && styles.appBorder]}>
                <View style={[styles.appDot, { backgroundColor: app.color }]} />
                <Text style={styles.appName}>{app.name}</Text>
                <View style={styles.appBarBg}>
                  <View style={[styles.appBarFill, { width: `${(app.minutes / INITIAL_APP_USAGE[0].minutes) * 100}%` }]} />
                </View>
                <Text style={styles.appMinutes}>{app.minutes}min</Text>
              </View>
            ))}
          </Card>
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
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.successLight, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  liveText: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.success },
  card: { ...shadows.sm },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertIcon: { fontSize: 20 },
  alertInfo: { flex: 1 },
  alertChild: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.semibold, color: colors.text },
  alertMessage: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  alertTime: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  appBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  appDot: { width: 10, height: 10, borderRadius: 5 },
  appName: { width: 80, fontSize: typography.fontSizes.caption, color: colors.text, fontWeight: typography.fontWeights.medium },
  appBarBg: { flex: 1, height: 8, backgroundColor: colors.borderLight, borderRadius: radius.full, overflow: 'hidden' },
  appBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  appMinutes: { width: 45, textAlign: 'right', fontSize: typography.fontSizes.caption, color: colors.textMuted, fontWeight: typography.fontWeights.medium },
  sectionLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm },
  monitorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  monitorCard: { width: '31%', flexGrow: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  monitorCardPressed: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  monitorIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  monitorTitle: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.text, textAlign: 'center', lineHeight: 16 },
});