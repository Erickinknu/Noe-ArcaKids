import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/avatar';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { WeeklyChart } from '@/components/ui/weekly-chart';
import { activityService, AlertItem, DailyUsage } from '@/features/activity/services/activity-service';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { unlockRequestService } from '@/features/unlock-request/services/unlock-request-service';
import { type UnlockRequest } from '@noe-arcakids/types';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { Card, errorMessage, useAsyncData, useRandomVerse, useTheme, VerseBanner, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';

interface DailyBar {
  date: string;
  label: string;
  minutes: number;
  color: string;
}

interface ChildActivitySummary {
  childId: string;
  childName: string;
  totalMinutes: number;
  dailyData: DailyUsage[];
}

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function getBarColor(minutes: number, colors: ThemeColors): string {
  if (minutes < 60) return colors.success;
  if (minutes <= 120) return colors.warning;
  return colors.danger;
}

function getAlertIcon(type: AlertItem['type']): string {
  if (type === 'block') return '🚫';
  if (type === 'time') return '⏰';
  return '📍';
}

const HISTORY_CHART_HEIGHT = 100;
const HISTORY_BAR_WIDTH = 28;

function getDayLetter(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay();
  const letters = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  return letters[day];
}

export default function ActivityScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const approveVerse = useRandomVerse(['family', 'love']);

  const fetchChildren = useCallback(async () => {
    const { family } = await familyService.getMyFamily();
    return childService.listChildren(family.id);
  }, []);
  const { data: children, error: childrenError, loading: childrenLoading, reload: reloadChildren } = useAsyncData(fetchChildren);

  const fetchUsage = useCallback(() => activityService.getAllChildrenUsage(7), []);
  const fetchAlerts = useCallback(() => activityService.getRecentAlerts(), []);
  const fetchUnlockRequests = useCallback(() => unlockRequestService.getPendingRequests(), []);
  const fetchPackageUsage = useCallback(
    () => selectedChildId ? activityService.getChildUsageByPackage(selectedChildId, 1) : Promise.resolve(null),
    [selectedChildId],
  );

  const { data: usageData, error: usageError, loading: usageLoading, reload: reloadUsage } = useAsyncData<DailyUsage[]>(fetchUsage);
  const { data: alerts, error: alertsError, loading: alertsLoading, reload: reloadAlerts } = useAsyncData<AlertItem[]>(fetchAlerts);
  const { data: unlockRequests, error: unlockError, loading: unlockLoading, reload: reloadUnlockRequests } = useAsyncData<UnlockRequest[]>(fetchUnlockRequests);
  const { data: packageUsage, loading: packageLoading, reload: reloadPackageUsage } = useAsyncData(fetchPackageUsage);

  useEffect(() => {
    if (selectedChildId) {
      void reloadPackageUsage();
    }
  }, [selectedChildId, reloadPackageUsage]);

  const loading = usageLoading || alertsLoading || unlockLoading || childrenLoading;
  const error = usageError || alertsError || unlockError || childrenError;
  const onRetry = useCallback(() => {
    reloadUsage();
    reloadAlerts();
    reloadUnlockRequests();
    reloadChildren();
  }, [reloadUsage, reloadAlerts, reloadUnlockRequests, reloadChildren]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([reloadUsage(), reloadAlerts(), reloadUnlockRequests(), reloadChildren()]).finally(() => setRefreshing(false));
  }, [reloadUsage, reloadAlerts, reloadUnlockRequests, reloadChildren]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([reloadUsage(), reloadAlerts(), reloadUnlockRequests(), reloadChildren()]).catch(() => {});
    }, [reloadUsage, reloadAlerts, reloadUnlockRequests, reloadChildren])
  );

  const handleResolveRequest = useCallback(async (requestId: string, status: 'approved' | 'denied') => {
    try {
      await unlockRequestService.resolveRequest(requestId, status);
      reloadUnlockRequests();
    } catch (cause) {
      Alert.alert('Error', errorMessage(cause));
    }
  }, [reloadUnlockRequests]);

  const selectedChild = (children ?? []).find((c) => c.id === selectedChildId) ?? null;

  const selectedUsage = useMemo(() => {
    if (!selectedChildId || !usageData) return [];
    return usageData.filter((e) => e.childId === selectedChildId);
  }, [usageData, selectedChildId]);

  const childSummaries = useMemo(() => {
    const grouped = new Map<string, ChildActivitySummary>();
    for (const e of selectedUsage) {
      const s = grouped.get(e.childId);
      if (s) { s.totalMinutes += e.minutes; s.dailyData.push(e); }
      else grouped.set(e.childId, { childId: e.childId, childName: e.childName, totalMinutes: e.minutes, dailyData: [e] });
    }
    return Array.from(grouped.values()).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }, [selectedUsage]);

  const weeklyBars = useMemo(() => {
    if (selectedUsage.length === 0) return [];
    const dayMap = new Map<string, number>();
    for (const e of selectedUsage) dayMap.set(e.reportDate, (dayMap.get(e.reportDate) ?? 0) + e.minutes);
    const bars: DailyBar[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dateStr = toLocalDateKey(d);
      const minutes = dayMap.get(dateStr) ?? 0;
      bars.push({ date: dateStr, label: formatDate(dateStr), minutes, color: getBarColor(minutes, colors) });
    }
    return bars;
  }, [selectedUsage, colors]);

  const maxMinutes = useMemo(() => Math.max(...weeklyBars.map((b) => b.minutes), 1), [weeklyBars]);

  const selectedAlerts = useMemo(
    () => (selectedChildId ? (alerts ?? []).filter((a) => a.childId === selectedChildId) : []),
    [alerts, selectedChildId],
  );
  const selectedUnlockRequests = useMemo(
    () => (selectedChildId ? (unlockRequests ?? []).filter((r) => r.childId === selectedChildId) : []),
    [unlockRequests, selectedChildId],
  );

  const hasNoChildren = (children?.length ?? 0) === 0;
  const hasSelectedData = selectedUsage.length > 0 || selectedAlerts.length > 0 || selectedUnlockRequests.length > 0;
  const maxPackageMinutes = packageUsage && packageUsage.packageUsages.length > 0 ? packageUsage.packageUsages[0].minutes : 0;

  if (loading && !usageData && !children) return <LoadingState text={tr('noe.activity.loading')} />;
  if (error && !usageData && !children && !alerts) return <ErrorState message={error} onRetry={onRetry} />;

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

      {hasNoChildren ? (
        <EmptyState icon="👶" title="Todavía no tienes hijos vinculados"
          description="Agrega o vincula un hijo en la pestaña Hijos para comenzar a monitorear su actividad." />
      ) : !selectedChild ? (
        <>
          <Text style={styles.sectionLabel}>Selecciona un hijo</Text>
          {(children ?? []).map((child) => (
            <Pressable key={child.id} onPress={() => setSelectedChildId(child.id)}>
              <Card style={styles.card}>
                <View style={styles.selectRow}>
                  <Avatar name={child.displayName} emoji={child.avatarUrl ?? undefined} size={44} />
                  <Text style={styles.selectName}>{child.displayName}</Text>
                  <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
                </View>
              </Card>
            </Pressable>
          ))}
        </>
      ) : (
        <>
          <Pressable style={styles.childChip} onPress={() => setSelectedChildId(null)}>
            <Avatar name={selectedChild.displayName} emoji={selectedChild.avatarUrl ?? undefined} size={24} />
            <Text style={styles.childChipText}>{selectedChild.displayName}</Text>
            <MaterialIcons name="swap-horiz" size={18} color={colors.primary} />
          </Pressable>

          {/* ── Monitoreo ── */}
          <Text style={styles.sectionLabel}>Monitoreo detallado</Text>
          <View style={styles.monitorGrid}>
            {([
              { icon: 'language' as const, title: 'Páginas\nweb', color: colors.primary, path: '/activity/web' },
              { icon: 'play-circle' as const, title: 'YouTube\nvideos', color: colors.danger, path: '/activity/youtube' },
              { icon: 'apps' as const, title: 'Apps\ninstaladas', color: colors.warning, path: '/activity/apps' },
              { icon: 'people' as const, title: 'Redes\nsociales', color: colors.danger, path: '/activity/social' },
              { icon: 'photo-library' as const, title: 'Imágenes\nrecibidas', color: colors.success, path: '/activity/media' },
              { icon: 'chat' as const, title: 'Conversa-\nciones', color: colors.success, path: '/activity/conversations' },
            ] as const).map((item) => (
              <Pressable
                key={item.title}
                style={({ pressed }) => [styles.monitorCard, pressed && styles.monitorCardPressed]}
                onPress={() => router.push({ pathname: item.path, params: { childId: selectedChild.id } })}
              >
                <View style={[styles.monitorIcon, { backgroundColor: item.color + '18' }]}>
                  <MaterialIcons name={item.icon} size={22} color={item.color} />
                </View>
                <Text style={styles.monitorTitle}>{item.title}</Text>
              </Pressable>
            ))}
          </View>

          {!hasSelectedData ? (
            <EmptyState icon="📊" title={`Aún no hay actividad registrada para ${selectedChild.displayName}`}
              description="Los datos de uso aparecerán aquí cuando el dispositivo de tu hijo reporte actividad." />
          ) : (
            <>
              {selectedUsage.length > 0 && (
                <>
                  <SectionHeader title={`Uso de ${selectedChild.displayName}`} />
                  <WeeklyChart
                    childSummaries={childSummaries}
                    weeklyBars={weeklyBars}
                    maxMinutes={maxMinutes}
                  />
                </>
              )}

              {/* ── App usage breakdown (hoy, real) ── */}
              <SectionHeader title="Uso por app (hoy)" />
              <Card style={styles.card}>
                {packageLoading ? (
                  <Text style={styles.mutedText}>Cargando...</Text>
                ) : !packageUsage || packageUsage.packageUsages.length === 0 ? (
                  <Text style={styles.mutedText}>Sin datos de uso por app para hoy.</Text>
                ) : (
                  packageUsage.packageUsages.map((app, i) => (
                    <View key={app.packageName} style={[styles.appRow, i < packageUsage.packageUsages.length - 1 && styles.appBorder]}>
                      <View style={[styles.appDot, { backgroundColor: getBarColor(app.minutes, colors) }]} />
                      <Text style={styles.appName} numberOfLines={1}>{app.packageName}</Text>
                      <View style={styles.appBarBg}>
                        <View style={[styles.appBarFill, { width: `${(app.minutes / maxPackageMinutes) * 100}%` }]} />
                      </View>
                      <Text style={styles.appMinutes}>{app.minutes}min</Text>
                    </View>
                  ))
                )}
              </Card>

              {selectedAlerts.length > 0 && (
                <>
                  <SectionHeader title={tr('noe.activity.recentAlerts')} />
                  {selectedAlerts.map((alert) => (
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

              {/* ── Unlock requests ── */}
              {selectedUnlockRequests.length > 0 && (
                <>
                  <SectionHeader title="Solicitudes de desbloqueo" />
                  {approveVerse ? (
                    <VerseBanner verse={approveVerse} title={tr('common.verseOfDay')} />
                  ) : null}
                  {selectedUnlockRequests.map((req) => (
                    <Card key={req.id} style={styles.card}>
                      <View style={styles.unlockRow}>
                        <MaterialIcons name="lock-open" size={20} color={colors.warning} />
                        <View style={styles.unlockInfo}>
                          <Text style={styles.unlockChild}>{req.childName}</Text>
                          <Text style={styles.unlockReason}>{req.reason ?? 'Sin motivo especificado'}</Text>
                          <Text style={styles.unlockTime}>{formatDate(req.createdAt)}</Text>
                        </View>
                        <View style={styles.unlockActions}>
                          <Pressable
                            style={({ pressed }) => [styles.unlockBtn, styles.unlockApprove, pressed && styles.unlockBtnPressed]}
                            onPress={() => handleResolveRequest(req.id, 'approved')}
                          >
                            <MaterialIcons name="check" size={18} color="#fff" />
                          </Pressable>
                          <Pressable
                            style={({ pressed }) => [styles.unlockBtn, styles.unlockDeny, pressed && styles.unlockBtnPressed]}
                            onPress={() => handleResolveRequest(req.id, 'denied')}
                          >
                            <MaterialIcons name="close" size={18} color="#fff" />
                          </Pressable>
                        </View>
                      </View>
                    </Card>
                  ))}
                </>
              )}
            </>
          )}

          {/* ── Usage History Bar Chart ── */}
          {weeklyBars.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Historial de uso (7 días)</Text>
              <Card style={styles.card}>
                <View style={styles.historyChart}>
                  {weeklyBars.map((bar) => (
                    <View key={bar.date} style={styles.historyBarColumn}>
                      <Text style={styles.historyBarValue}>
                        {bar.minutes > 0 ? `${bar.minutes}m` : ''}
                      </Text>
                      <View
                        style={[
                          styles.historyBar,
                          {
                            height: Math.max((bar.minutes / maxMinutes) * HISTORY_CHART_HEIGHT, 4),
                            backgroundColor: bar.color,
                          },
                        ]}
                      />
                      <Text style={styles.historyBarLabel}>{getDayLetter(bar.date)}</Text>
                    </View>
                  ))}
                </View>
              </Card>
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
  screen: { paddingTop: spacing.xxl, padding: spacing.lg, backgroundColor: colors.background, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: typography.fontSizes.heading, fontWeight: typography.fontWeights.bold, color: colors.text },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, backgroundColor: colors.successLight, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.full },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.success },
  liveText: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.success },
  card: { ...shadows.sm },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  selectName: { flex: 1, fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.semibold, color: colors.text },
  childChip: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, marginBottom: spacing.xs },
  childChipText: { fontSize: typography.fontSizes.body, fontWeight: typography.fontWeights.semibold, color: colors.primary },
  mutedText: { fontSize: typography.fontSizes.caption, color: colors.textMuted, lineHeight: 20 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  alertIcon: { fontSize: 20 },
  alertInfo: { flex: 1 },
  alertChild: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.semibold, color: colors.text },
  alertMessage: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  alertTime: { fontSize: typography.fontSizes.caption, color: colors.textMuted },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  appBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  appDot: { width: 10, height: 10, borderRadius: 5 },
  appName: { width: 110, fontSize: typography.fontSizes.caption, color: colors.text, fontWeight: typography.fontWeights.medium },
  appBarBg: { flex: 1, height: 8, backgroundColor: colors.borderLight, borderRadius: radius.full, overflow: 'hidden' },
  appBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: radius.full },
  appMinutes: { width: 45, textAlign: 'right', fontSize: typography.fontSizes.caption, color: colors.textMuted, fontWeight: typography.fontWeights.medium },
  sectionLabel: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.sm },
  monitorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  monitorCard: { width: '31%', flexGrow: 1, alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  monitorCardPressed: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  monitorIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  monitorTitle: { fontSize: typography.fontSizes.caption, fontWeight: typography.fontWeights.medium, color: colors.text, textAlign: 'center', lineHeight: 16 },
  unlockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unlockInfo: { flex: 1 },
  unlockChild: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.semibold, color: colors.text },
  unlockReason: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  unlockTime: { fontSize: typography.fontSizes.caption, color: colors.textMuted, marginTop: 2 },
  unlockActions: { flexDirection: 'row', gap: spacing.xs },
  unlockBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  unlockBtnPressed: { opacity: 0.8 },
  unlockApprove: { backgroundColor: colors.success },
  unlockDeny: { backgroundColor: colors.danger },
  historyChart: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: HISTORY_CHART_HEIGHT + spacing.xl, paddingTop: spacing.xs },
  historyBarColumn: { alignItems: 'center', flex: 1 },
  historyBarValue: { fontSize: 10, color: colors.textMuted, marginBottom: 4 },
  historyBar: { width: HISTORY_BAR_WIDTH, borderRadius: radius.sm, minHeight: 4 },
  historyBarLabel: { fontSize: 10, color: colors.textMuted, marginTop: 4, fontWeight: typography.fontWeights.medium },
});