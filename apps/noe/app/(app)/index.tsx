import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/avatar';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusDot } from '@/components/ui/status-dot';
import {
  errorMessage,
  radius,
  spacing,
  typography,
  useNetworkStatus,
  useTheme,
  type ThemeColors,
  type ThemeShadows,
  Card,
} from '@noe-arcakids/shared';
import {
  dashboardService,
  formatDuration,
  relativeTime,
} from '@/features/dashboard/services/dashboard-service';
import type { ChildSummary, FamilySummary } from '@/features/dashboard/types';
import { activityService, type AlertItem } from '@/features/activity/services/activity-service';
import { familyService } from '@/features/family/services/family-service';
import { parentalService } from '@/features/parental/services/parental-service';
import { deviceControlService } from '@/features/device-control/services/device-control-service';
import { ROUTES } from '@/constants';

const FETCH_TIMEOUT_MS = 10_000;

export default function DashboardScreen() {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { isOnline } = useNetworkStatus();

  const [data, setData] = useState<FamilySummary | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [childSelectVisible, setChildSelectVisible] = useState(false);
  const [childSelectAction, setChildSelectAction] = useState<'block' | 'alert' | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const result = await Promise.race([
        dashboardService.getFamilySummary(),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error('Fetch timeout'));
          });
        }),
      ]);
      setData(result);
      const [myFamily, recentAlerts] = await Promise.all([
        familyService.getMyFamily().catch(() => null),
        activityService.getRecentAlerts().catch(() => []),
      ]);
      if (myFamily) setFamilyId(myFamily.family.id);
      setAlerts(recentAlerts.slice(0, 3));
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(errorMessage(cause));
      }
    } finally {
      clearTimeout(timeoutId);
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const runFetch = async () => {
      if (cancelled) return;
      await fetchData();
    };
    runFetch();
    return () => {
      cancelled = true;
      abortControllerRef.current?.abort();
    };
  }, [fetchData]);

  useFocusEffect(
    useCallback(() => {
      fetchData(true);
    }, [fetchData])
  );

  const handleRefresh = useCallback(() => fetchData(true), [fetchData]);

  const handleQuickBlock = useCallback(
    (child: ChildSummary) => {
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
                fetchData(true);
              } catch {
                Alert.alert(tr('noe.dashboard.comingSoon'));
              }
            },
          },
        ],
      );
    },
    [familyId, fetchData, tr]
  );

  const handleChildSelect = useCallback(
    async (childId: string) => {
      setChildSelectVisible(false);
      if (childSelectAction === 'block') {
        try {
          await deviceControlService.blockChild(childId);
          Alert.alert('Dispositivo bloqueado', 'El dispositivo del hijo ha sido bloqueado exitosamente.');
        } catch {
          Alert.alert('Error', 'No se pudo bloquear el dispositivo. Intenta de nuevo.');
        }
      } else if (childSelectAction === 'alert') {
        try {
          await deviceControlService.triggerAlert(childId);
          Alert.alert('Alerta sonora activada', 'Sonará por 5 minutos.');
        } catch {
          Alert.alert('Error', 'No se pudo activar la alerta. Intenta de nuevo.');
        }
      }
      setChildSelectAction(null);
    },
    [childSelectAction]
  );

  const handleAddTime = useCallback(
    (child: ChildSummary, minutes: number) => {
      if (!familyId) return;
      const currentLimit = child.dailyLimitMinutes ?? 120;
      Alert.alert(
        tr('noe.dashboard.addTimeTitle'),
        tr('noe.dashboard.addTimeConfirm', { name: child.name, minutes }),
        [
          { text: tr('common.cancel'), style: 'cancel' },
          {
            text: tr('noe.dashboard.addTimeConfirmButton'),
            onPress: async () => {
              try {
                await parentalService.saveRules(familyId, child.id, { dailyLimitMinutes: currentLimit + minutes });
                fetchData(true);
              } catch {
                Alert.alert(tr('noe.dashboard.comingSoon'));
              }
            },
          },
        ],
      );
    },
    [familyId, fetchData, tr]
  );

  /* ── Loading / Error / Empty states ── */
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

  if (!data) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('common.loading')} />
      </View>
    );
  }

  /* ── Computed data ── */
  const totalMinutesToday = dashboardService.getTotalMinutesToday(data.children);
  const connectedCount = dashboardService.getConnectedCount(data.children);
  const hasAlerts = alerts.length > 0;

  /* ── Render ── */
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.scrollContent, { paddingTop: screenPadding.paddingTop }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Offline banner ── */}
        {!isOnline && (
          <View style={styles.offlineBanner}>
            <MaterialIcons name="wifi-off" size={16} color={colors.warning} />
            <Text style={styles.offlineText}>{tr('noe.dashboard.offline')}</Text>
          </View>
        )}

        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar name={data.parentName} size={44} />
            <View style={styles.headerTextGroup}>
              <Text style={styles.greeting}>
                {tr('noe.dashboard.greeting', { name: data.parentName })}
              </Text>
              <Text style={styles.subtitle}>
                {connectedCount > 0
                  ? tr('noe.dashboard.connectedCount', { count: connectedCount, total: data.totalChildren })
                  : tr('noe.dashboard.noChildrenOnline')}
              </Text>
            </View>
          </View>
          <Pressable
            style={styles.notificationBell}
            onPress={() => router.push({ pathname: ROUTES.notifications } as any)}
          >
            <MaterialIcons name="notifications" size={22} color={colors.text} />
            {data.alertsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{data.alertsCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Quick actions ── */}
        <Text style={styles.sectionTitle}>Acciones rápidas</Text>
        <View style={styles.quickActionsRow}>
          {[
            { icon: 'lock' as const, label: 'Bloquear\ntodos', color: colors.danger, onPress: () => { setChildSelectAction('block'); setChildSelectVisible(true); } },
            { icon: 'notifications-active' as const, label: 'Enviar\nalerta', color: colors.warning, onPress: () => { setChildSelectAction('alert'); setChildSelectVisible(true); } },
            { icon: 'location-searching' as const, label: 'Ubicar\nhijos', color: colors.success, onPress: () => router.push('/activity/location' as any) },
            { icon: 'school' as const, label: 'Modo\nestudio', color: colors.primary, onPress: () => router.push('/rules/modo-estudio' as any) },
          ].map((action) => (
            <Pressable
              key={action.label}
              style={({ pressed }) => [
                styles.quickActionCard,
                pressed && styles.quickActionPressed,
                data.children.length === 0 && styles.quickActionDisabled,
              ]}
              onPress={data.children.length === 0 ? undefined : action.onPress}
            >
              <View style={[styles.quickActionIcon, { backgroundColor: action.color + '18' }]}>
                <MaterialIcons name={action.icon} size={22} color={action.color} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Vincular dispositivo ── */}
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.linkDeviceCard,
            pressed && styles.quickActionPressed,
            data.children.length === 0 && styles.linkDeviceCardDisabled,
          ]}
          onPress={
            data.children.length === 0
              ? undefined
              : () => router.push(ROUTES.linking as any)
          }
        >
          <View style={[styles.linkDeviceIcon, { backgroundColor: colors.primary + '18' }]}>
            <MaterialIcons name="link" size={20} color={colors.primary} />
          </View>
          <View style={styles.linkDeviceInfo}>
            <Text style={styles.linkDeviceTitle}>Vincular un dispositivo</Text>
            <Text style={styles.linkDeviceDesc}>
              Genera el código y QR para conectar la app ARCA KIDS de tu hijo.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
        </Pressable>

        {/* ── Resumen del día ── */}
        <Card style={styles.daySummaryCard}>
          <View style={styles.daySummaryHeader}>
            <MaterialIcons name="today" size={20} color={colors.primary} />
            <Text style={styles.daySummaryTitle}>Resumen de hoy</Text>
          </View>
          <View style={styles.daySummaryGrid}>
            <View style={styles.daySummaryItem}>
              <Text style={styles.daySummaryValue}>{formatDuration(totalMinutesToday)}</Text>
              <Text style={styles.daySummaryLabel}>Tiempo total</Text>
            </View>
            <View style={styles.daySummaryDivider} />
            <View style={styles.daySummaryItem}>
              <Text style={styles.daySummaryValue}>{data.children.length}</Text>
              <Text style={styles.daySummaryLabel}>Hijos</Text>
            </View>
            <View style={styles.daySummaryDivider} />
            <View style={styles.daySummaryItem}>
              <Text style={[styles.daySummaryValue, { color: data.alertsCount > 0 ? colors.warning : colors.success }]}>
                {data.alertsCount}
              </Text>
              <Text style={styles.daySummaryLabel}>Alertas</Text>
            </View>
          </View>
        </Card>

        {/* ── Summary cards ── */}
        <View style={styles.summaryRow}>
          <SummaryCard
            icon="wifi"
            value={`${connectedCount}/${data.totalChildren}`}
            label={tr('noe.dashboard.online')}
            color={colors.success}
          />
          <SummaryCard
            icon="schedule"
            value={formatDuration(totalMinutesToday)}
            label={tr('noe.dashboard.totalTime')}
            color={colors.primary}
          />
          <SummaryCard
            icon="warning"
            value={String(data.alertsCount)}
            label={tr('noe.dashboard.alerts')}
            color={colors.warning}
          />
        </View>

        {/* ── Children section ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{tr('noe.dashboard.myChildren')}</Text>
          <Pressable onPress={() => router.push(ROUTES.children as any)}>
            <Text style={styles.sectionAction}>{tr('noe.dashboard.seeAll')}</Text>
          </Pressable>
        </View>

        {data.children.length === 0 ? (
          <Card style={styles.emptyChildrenCard}>
            <MaterialIcons name="child-care" size={32} color={colors.textMuted} />
            <Text style={styles.emptyChildrenTitle}>{tr('noe.dashboard.empty')}</Text>
            <Pressable
              style={({ pressed }) => [styles.emptyChildrenBtn, pressed && styles.quickActionPressed]}
              onPress={() => router.push(ROUTES.children as any)}
            >
              <Text style={styles.emptyChildrenBtnText}>{tr('noe.dashboard.addChild')}</Text>
            </Pressable>
          </Card>
        ) : (
          data.children.map((child) => (
            <ChildRow
              key={child.id}
              child={child}
              familyId={familyId}
              onRefresh={() => fetchData(true)}
              onQuickBlock={handleQuickBlock}
              onAddTime={handleAddTime}
            />
          ))
        )}

        {/* ── Recent activity ── */}
        {hasAlerts && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{tr('noe.dashboard.recentActivity')}</Text>
              <Pressable onPress={() => router.push(ROUTES.activity as any)}>
                <Text style={styles.sectionAction}>{tr('noe.dashboard.seeAll')}</Text>
              </Pressable>
            </View>

            {alerts.map((alert) => (
              <Card key={alert.id} style={styles.alertCard}>
                <View style={styles.alertRow}>
                  <Text style={styles.alertIcon}>
                    {alert.type === 'block' ? '🚫' : alert.type === 'time' ? '⏰' : '📍'}
                  </Text>
                  <View style={styles.alertInfo}>
                    <Text style={styles.alertChild}>{alert.childName}</Text>
                    <Text style={styles.alertMessage}>{alert.message}</Text>
                  </View>
                  <Text style={styles.alertTime}>{relativeTime(alert.timestamp)}</Text>
                </View>
              </Card>
            ))}
          </>
        )}

      </ScrollView>

      {/* ── Child select modal ── */}
      <ChildSelectModal
        visible={childSelectVisible}
        childList={data?.children ?? []}
        onClose={() => { setChildSelectVisible(false); setChildSelectAction(null); }}
        onSelect={handleChildSelect}
        actionType={childSelectAction}
      />
    </View>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
════════════════════════════════════════════════════════════════════════════════════════════════ */

function SummaryCard({
  icon,
  value,
  label,
  color,
}: {
  icon: string;
  value: string;
  label: string;
  color: string;
}) {
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIconWrap, { backgroundColor: color + '18' }]}>
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function ChildSelectModal({
  visible,
  childList,
  onClose,
  onSelect,
  actionType,
}: {
  visible: boolean;
  childList: ChildSummary[];
  onClose: () => void;
  onSelect: (childId: string) => void;
  actionType: 'block' | 'alert' | null;
}) {
  const { colors, shadows } = useTheme();
  const { t: tr } = useTranslation();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const title = tr('noe.dashboard.selectChild');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{title}</Text>
          <FlatList
            data={childList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                style={styles.modalChildRow}
                onPress={() => onSelect(item.id)}
              >
                <Avatar name={item.name} emoji={item.avatarUrl ?? undefined} size={40} />
                <Text style={styles.modalChildName}>{item.name}</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
          />
          <Pressable style={styles.modalCancelButton} onPress={onClose}>
            <Text style={styles.modalCancelText}>{tr('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function ChildRow({
  child,
  familyId,
  onRefresh,
  onQuickBlock,
  onAddTime,
}: {
  child: ChildSummary;
  familyId: string | null;
  onRefresh: () => void;
  onQuickBlock: (child: ChildSummary) => void;
  onAddTime: (child: ChildSummary, minutes: number) => void;
}) {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const router = useRouter();
  const usageRatio =
    child.dailyLimitMinutes != null && child.dailyLimitMinutes > 0
      ? child.minutesToday / child.dailyLimitMinutes
      : 0;
  const isOverLimit = usageRatio >= 1;
  const isNearLimit = usageRatio >= 0.8 && !isOverLimit;

  return (
    <Card style={[styles.childCard, !child.isOnline && styles.childCardOffline]}>
      {/* Row 1: Avatar + Name + Status */}
      <View style={styles.childTop}>
        <Avatar name={child.name} emoji={child.avatarUrl ?? undefined} size={44} />
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{child.name}</Text>
          <StatusDot
            online={child.isOnline}
            showLabel
            label={
              child.isOnline
                ? tr('noe.dashboard.online')
                : tr('noe.dashboard.offlineChild', { time: relativeTime(child.lastSeenAt) })
            }
          />
        </View>
        {child.isOnline && (
          <Pressable
            style={[styles.blockBtn, (isOverLimit || isNearLimit) && styles.blockBtnActive]}
            onPress={() => onQuickBlock(child)}
          >
            <MaterialIcons
              name={isOverLimit ? 'block' : 'pause-circle'}
              size={22}
              color={isOverLimit ? colors.danger : colors.textMuted}
            />
          </Pressable>
        )}
      </View>

      {/* Row 2: Screen time + Progress */}
      <View style={styles.childUsage}>
        <View style={styles.usageLabel}>
          <Text style={styles.usageText}>
            {child.dailyLimitMinutes != null
              ? `${formatDuration(child.minutesToday)} / ${formatDuration(child.dailyLimitMinutes)}`
              : formatDuration(child.minutesToday)}
          </Text>
          {isOverLimit && (
            <View style={styles.overLimitBadge}>
              <Text style={styles.overLimitText}>{tr('noe.dashboard.overLimit')}</Text>
            </View>
          )}
        </View>
        {child.dailyLimitMinutes != null && (
          <ProgressBar value={child.minutesToday} max={child.dailyLimitMinutes} height={6} />
        )}
      </View>

      {/* Row 3: Quick action chips */}
      <View style={styles.childChips}>
        <Pressable
          style={styles.chip}
          onPress={() =>
            Alert.alert(tr('noe.dashboard.addTimeTitle'), '', [
              { text: tr('noe.dashboard.addTimeOptions.fifteen'), onPress: () => onAddTime(child, 15) },
              { text: tr('noe.dashboard.addTimeOptions.thirty'), onPress: () => onAddTime(child, 30) },
              { text: tr('noe.dashboard.addTimeOptions.sixty'), onPress: () => onAddTime(child, 60) },
              { text: tr('common.cancel'), style: 'cancel' },
            ])
          }
        >
          <MaterialIcons name="add-circle-outline" size={16} color={colors.primary} />
          <Text style={styles.chipText}>{tr('noe.dashboard.addTime')}</Text>
        </Pressable>

        <Pressable
          style={styles.chip}
          onPress={() => router.push({ pathname: '/children/[childId]', params: { childId: child.id } } as any)}
        >
          <MaterialIcons name="info-outline" size={16} color={colors.textMuted} />
          <Text style={[styles.chipText, { color: colors.textMuted }]}>{tr('noe.dashboard.details')}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════════════════════
   STYLES
═════════════════════════════════════════════════════════════════════════════════════════════════ */

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },

  /* ── Offline ── */
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

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  headerTextGroup: {
    gap: 2,
    flex: 1,
  },
  greeting: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
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
    backgroundColor: colors.background,
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

  /* ── Summary cards ── */
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
    ...shadows.sm,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  summaryLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },

  /* ── Section headers ── */
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  sectionAction: {
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },

  /* ── Child card ── */
  childCard: {
    gap: spacing.md,
  },
  childCardOffline: {
    opacity: 0.6,
  },
  childTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  childInfo: {
    flex: 1,
    gap: 2,
  },
  childName: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  blockBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  blockBtnActive: {
    backgroundColor: colors.dangerLight,
  },
  childUsage: {
    gap: spacing.xs,
  },
  usageLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  usageText: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  overLimitBadge: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  overLimitText: {
    fontSize: 10,
    fontWeight: typography.fontWeights.bold,
    color: colors.danger,
  },
  childChips: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },

  /* ── Alert cards ── */
  alertCard: {
    padding: spacing.md,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  alertIcon: {
    fontSize: 20,
  },
  alertInfo: {
    flex: 1,
  },
  alertChild: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  alertMessage: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  alertTime: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },

  /* ── Quick actions ── */
  quickActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
    ...shadows.sm,
  },
  quickActionPressed: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  quickActionDisabled: {
    opacity: 0.4,
  },
  linkDeviceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  linkDeviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkDeviceInfo: {
    flex: 1,
  },
  linkDeviceTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  linkDeviceDesc: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    lineHeight: 16,
  },
  linkDeviceCardDisabled: {
    opacity: 0.4,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 16,
  },
  daySummaryCard: {
    padding: spacing.md,
  },
  daySummaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  daySummaryTitle: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  daySummaryGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  daySummaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  daySummaryValue: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  daySummaryLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  daySummaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: colors.border,
  },

  /* ── Child select modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  modalChildName: {
    flex: 1,
    fontSize: typography.fontSizes.body,
    color: colors.text,
  },
  modalSeparator: {
    height: 1,
    backgroundColor: colors.border,
  },
  modalCancelButton: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  modalCancelText: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },

  /* ── Empty children card ── */
  emptyChildrenCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    ...shadows.sm,
  },
  emptyChildrenTitle: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    textAlign: 'center',
  },
  emptyChildrenDesc: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyChildrenBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  emptyChildrenBtnText: {
    color: colors.onPrimary,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
  },
});