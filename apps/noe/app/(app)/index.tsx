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
  TextInput,
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
  useVerseOfDay,
  VerseBanner,
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
import { pinSyncService } from '@/features/pin/services/pin-sync-service';
import { ROUTES } from '@/constants';

const FETCH_TIMEOUT_MS = 10_000;

export default function DashboardScreen() {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { isOnline } = useNetworkStatus();
  const reflectVerse = useVerseOfDay();

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
      pinSyncService.syncCurrentPin();
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

  const handleSetLimit = useCallback(
    (child: ChildSummary, minutes: number | null) => {
      if (!familyId) return;
      if (minutes === null) {
        Alert.alert(
          tr('noe.dashboard.removeLimit'),
          tr('noe.dashboard.removeLimitConfirm', { name: child.name }),
          [
            { text: tr('common.cancel'), style: 'cancel' },
            {
              text: tr('noe.dashboard.removeLimitConfirmButton'),
              style: 'destructive',
              onPress: async () => {
                try {
                  await parentalService.saveRules(familyId, child.id, { dailyLimitMinutes: null });
                  fetchData(true);
                } catch {
                  Alert.alert(tr('noe.dashboard.comingSoon'));
                }
              },
            },
          ],
        );
        return;
      }
      Alert.alert(
        tr('noe.dashboard.adjustLimitTitle'),
        tr('noe.dashboard.setLimitConfirm', { name: child.name, minutes }),
        [
          { text: tr('common.cancel'), style: 'cancel' },
          {
            text: tr('noe.dashboard.setLimit'),
            onPress: async () => {
              try {
                await parentalService.saveRules(familyId, child.id, { dailyLimitMinutes: minutes });
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
            <Avatar name={data.parentName} size={46} />
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
            onPress={() => router.push({ pathname: ROUTES.profileNotifications } as any)}
          >
            <MaterialIcons name="notifications" size={22} color={colors.text} />
            {data.alertsCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{data.alertsCount}</Text>
              </View>
            )}
          </Pressable>
        </View>

        {/* ── Resumen del día: KPIs ── */}
        <View style={styles.kpiRow}>
          <KpiTile
            icon="wifi"
            value={`${connectedCount}/${data.totalChildren}`}
            label={tr('noe.dashboard.online')}
            color={colors.success}
          />
          <KpiTile
            icon="schedule"
            value={formatDuration(totalMinutesToday)}
            label={tr('noe.dashboard.totalTime')}
            color={colors.primary}
          />
          <KpiTile
            icon="warning"
            value={String(data.alertsCount)}
            label={tr('noe.dashboard.alerts')}
            color={data.alertsCount > 0 ? colors.warning : colors.success}
          />
        </View>

        {/* ── Acciones rápidas ── */}
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Acciones rápidas</Text>
          <View style={styles.quickActionsRow}>
            {[
              {
                icon: 'lock' as const,
                title: 'Bloquear todos',
                sub: data.children.length === 1 ? '1 dispositivo' : `${data.children.length} dispositivos`,
                color: colors.danger,
                onPress: () => { setChildSelectAction('block'); setChildSelectVisible(true); },
              },
              {
                icon: 'notifications-active' as const,
                title: 'Enviar alerta',
                sub: 'SOS o aviso sonoro',
                color: colors.warning,
                onPress: () => { setChildSelectAction('alert'); setChildSelectVisible(true); },
              },
              {
                icon: 'location-searching' as const,
                title: 'Ubicar hijos',
                sub: 'Mapa en vivo',
                color: colors.success,
                onPress: () => router.push('/location' as any),
              },
              {
                icon: 'school' as const,
                title: 'Modo estudio',
                sub: 'Plantilla de estudio',
                color: colors.primary,
                onPress: () => router.push('/rules/modo-estudio' as any),
              },
            ].map((action) => (
              <Pressable
                key={action.title}
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
                <Text style={styles.quickActionLabel}>{action.title}</Text>
                <Text style={styles.quickActionSub}>{action.sub}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* ── Vincular dispositivo ── */}
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.linkDeviceCard,
            pressed && styles.linkDeviceCardPressed,
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
          <MaterialIcons name="chevron-right" size={20} color={colors.primary} />
        </Pressable>

        {/* ── Mis hijos ── */}
        <View style={styles.group}>
          <View style={styles.sectionHeaderInner}>
            <Text style={styles.groupTitle}>{tr('noe.dashboard.myChildren')}</Text>
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
                onSetLimit={handleSetLimit}
              />
            ))
          )}
        </View>

        {/* ── Para reflexionar ── */}
        {reflectVerse ? (
          <VerseBanner verse={reflectVerse} title={tr('noe.dashboard.reflect')} />
        ) : null}

        {/* ── Actividad reciente ── */}
        {hasAlerts && (
          <View style={styles.group}>
            <View style={styles.sectionHeaderInner}>
              <Text style={styles.groupTitle}>{tr('noe.dashboard.recentActivity')}</Text>
              <Pressable onPress={() => router.push(ROUTES.activity as any)}>
                <Text style={styles.sectionAction}>{tr('noe.dashboard.seeAll')}</Text>
              </Pressable>
            </View>

            {alerts.map((alert) => (
              <View key={alert.id} style={styles.alertCard}>
                <View style={[styles.alertIconBadge, { backgroundColor: (alert.type === 'block' ? colors.danger : alert.type === 'time' ? colors.warning : colors.primary) + '18' }]}>
                  <MaterialIcons
                    name={alert.type === 'block' ? 'block' : alert.type === 'time' ? 'timer' : 'location-on'}
                    size={18}
                    color={alert.type === 'block' ? colors.danger : alert.type === 'time' ? colors.warning : colors.primary}
                  />
                </View>
                <View style={styles.alertInfo}>
                  <Text style={styles.alertChild}>{alert.childName}</Text>
                  <Text style={styles.alertMessage}>{alert.message}</Text>
                </View>
                <Text style={styles.alertTime}>{relativeTime(alert.timestamp)}</Text>
              </View>
            ))}
          </View>
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

function KpiTile({
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
    <View style={styles.kpiTile}>
      <View style={[styles.kpiIconWrap, { backgroundColor: color + '18' }]}>
        <MaterialIcons name={icon as any} size={18} color={color} />
      </View>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
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
  onSetLimit,
}: {
  child: ChildSummary;
  familyId: string | null;
  onRefresh: () => void;
  onQuickBlock: (child: ChildSummary) => void;
  onSetLimit: (child: ChildSummary, minutes: number | null) => void;
}) {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const router = useRouter();
  const [limitModalVisible, setLimitModalVisible] = useState(false);
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
          <Text style={styles.usageValue}>
            {child.dailyLimitMinutes != null && child.dailyLimitMinutes > 0
              ? `${Math.min(100, Math.round(usageRatio * 100))}%`
              : ''}
          </Text>
          <Text style={styles.usageText}>
            {child.dailyLimitMinutes != null
              ? `${formatDuration(child.minutesToday)} de ${formatDuration(child.dailyLimitMinutes)}`
              : formatDuration(child.minutesToday)}
          </Text>
          {isOverLimit && (
            <View style={styles.overLimitBadge}>
              <MaterialIcons name="warning" size={10} color={colors.danger} />
              <Text style={styles.overLimitText}>{tr('noe.dashboard.overLimit')}</Text>
            </View>
          )}
        </View>
        {child.dailyLimitMinutes != null && (
          <ProgressBar value={child.minutesToday} max={child.dailyLimitMinutes} height={7} />
        )}
      </View>

      {/* Row 3: Quick action chips */}
      <View style={styles.childChips}>
        <Pressable style={styles.chip} onPress={() => setLimitModalVisible(true)}>
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

      {limitModalVisible ? (
        <DailyLimitModal
          child={child}
          visible
          onClose={() => setLimitModalVisible(false)}
          onApply={(c, minutes) => {
            setLimitModalVisible(false);
            onSetLimit(c, minutes);
          }}
        />
      ) : null}
    </Card>
  );
}

function DailyLimitModal({
  child,
  visible,
  onClose,
  onApply,
}: {
  child: ChildSummary;
  visible: boolean;
  onClose: () => void;
  onApply: (child: ChildSummary, minutes: number | null) => void;
}) {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [minutes, setMinutes] = useState(() => child.dailyLimitMinutes ?? 120);

  const clamp = (m: number) => Math.min(1440, Math.max(1, Math.round(m)));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} accessibilityViewIsModal>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{tr('noe.dashboard.adjustLimitTitle')}</Text>
          <Text style={styles.modalHint}>{tr('noe.dashboard.adjustLimitHint')}</Text>

          <View style={styles.limitSteppers}>
            <Pressable style={styles.modalStepBtn} onPress={() => setMinutes(clamp(minutes - 60))}>
              <MaterialIcons name="remove" size={18} color={colors.primary} />
              <Text style={styles.modalStepLabel}>1h</Text>
            </Pressable>
            <Pressable style={styles.modalStepBtn} onPress={() => setMinutes(clamp(minutes - 15))}>
              <MaterialIcons name="remove" size={18} color={colors.primary} />
              <Text style={styles.modalStepLabel}>15m</Text>
            </Pressable>
            <Text style={styles.modalValue}>{formatDuration(minutes)}</Text>
            <Pressable style={styles.modalStepBtn} onPress={() => setMinutes(clamp(minutes + 15))}>
              <MaterialIcons name="add" size={18} color={colors.primary} />
              <Text style={styles.modalStepLabel}>15m</Text>
            </Pressable>
            <Pressable style={styles.modalStepBtn} onPress={() => setMinutes(clamp(minutes + 60))}>
              <MaterialIcons name="add" size={18} color={colors.primary} />
              <Text style={styles.modalStepLabel}>1h</Text>
            </Pressable>
          </View>

          <View style={styles.limitChips}>
            {[15, 30, 60, 90, 120, 240].map((m) => (
              <Pressable
                key={m}
                style={[styles.limitChip, minutes === m && styles.limitChipActive]}
                onPress={() => setMinutes(m)}
              >
                <Text style={[styles.limitChipText, minutes === m && styles.limitChipTextActive]}>
                  {m} min
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.limitInputRow}>
            <MaterialIcons name="edit" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.limitInput}
              value={String(minutes)}
              onChangeText={(text) => {
                if (text === '') {
                  setMinutes(1);
                  return;
                }
                const parsed = parseInt(text, 10);
                if (!Number.isNaN(parsed)) setMinutes(clamp(parsed));
              }}
              keyboardType="number-pad"
              maxLength={4}
            />
            <Text style={styles.limitInputSuffix}>min / día</Text>
          </View>

          <View style={styles.limitActions}>
            <Pressable
              style={({ pressed }) => [styles.limitRemoveBtn, pressed && styles.limitBtnPressed]}
              onPress={() => onApply(child, null)}
            >
              <Text style={styles.limitRemoveText}>{tr('noe.dashboard.removeLimit')}</Text>
            </Pressable>
            <View style={styles.limitActionsRow}>
              <Pressable
                style={({ pressed }) => [styles.limitCancelBtn, pressed && styles.limitBtnPressed]}
                onPress={onClose}
              >
                <Text style={styles.limitCancelText}>{tr('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.limitSaveBtn, pressed && styles.limitBtnPressed]}
                onPress={() => onApply(child, minutes)}
              >
                <Text style={styles.limitSaveText}>{tr('noe.dashboard.setLimit')}</Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
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

  /* ── Section groups (jerarquía tipo panel) ── */
  group: {
    gap: spacing.sm,
  },
  groupTitle: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 2,
    marginLeft: 2,
  },
  sectionHeaderInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  /* ── KPI tiles ── */
  kpiRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  kpiTile: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
    ...shadows.sm,
  },
  kpiIconWrap: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  kpiValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
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
  usageValue: {
    fontFamily: typography.fontFamily.heading,
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
    color: colors.primary,
    letterSpacing: -0.3,
    marginRight: 2,
  },
  overLimitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
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
  alertIconBadge: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
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
    backgroundColor: colors.primaryLight,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  linkDeviceCardPressed: {
    backgroundColor: colors.surfaceHover,
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
    color: colors.primary,
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
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    lineHeight: 16,
  },
  quickActionSub: {
    fontSize: 10.5,
    color: colors.textMuted,
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

  /* ── Daily limit modal ── */
  modalHint: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  limitSteppers: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  modalStepBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 44,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  modalStepLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    fontWeight: typography.fontWeights.medium,
  },
  modalValue: {
    minWidth: 84,
    textAlign: 'center',
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  limitChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  limitChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  limitChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  limitChipText: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    fontWeight: typography.fontWeights.medium,
  },
  limitChipTextActive: {
    color: colors.onPrimary,
  },
  limitInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  limitInput: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: spacing.xs,
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  limitInputSuffix: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  limitActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  limitRemoveBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  limitRemoveText: {
    color: colors.danger,
    fontWeight: typography.fontWeights.semibold,
  },
  limitActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  limitCancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  limitCancelText: {
    color: colors.text,
    fontWeight: typography.fontWeights.semibold,
  },
  limitSaveBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  limitSaveText: {
    color: colors.onPrimary,
    fontWeight: typography.fontWeights.semibold,
  },
  limitBtnPressed: {
    opacity: 0.85,
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