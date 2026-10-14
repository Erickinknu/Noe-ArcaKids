import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/avatar';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { ROUTES } from '@/constants';
import {
  Avatar3D,
  Card,
  errorMessage,
  radius,
  spacing,
  typography,
  useTheme,
  type ThemeColors,
} from '@noe-arcakids/shared';
import type { ChildProfile, Notification } from '@noe-arcakids/types';

import {
  activityService,
  type ChildUsageSummary,
} from '@/features/activity/services/activity-service';
import { categoryForPackage, friendlyAppName } from '@/features/activity/utils/app-links';
import { controlService } from '@/features/control/services/control-service';
import type { ChildHeader } from '@/features/control/components/control-types';
import { childService } from '@/features/children/services/child-service';
import { formatDuration, relativeTime } from '@/features/dashboard/services/dashboard-service';
import {
  deviceControlService,
  type ChildLocation,
} from '@/features/device-control/services/device-control-service';
import { familyService } from '@/features/family/services/family-service';
import { notificationsService } from '@/features/notifications/services/notifications-service';
import { useUnreadNotificationCount } from '@/features/notifications/hooks/use-notifications';
import { parentalService } from '@/features/parental/services/parental-service';
import { pinSyncService } from '@/features/pin/services/pin-sync-service';

const ADD_TIME_OPTIONS = [15, 30, 60] as const;
const MAX_DAILY_LIMIT_MINUTES = 1440;

interface HomeChildData {
  location: ChildLocation | null;
  header: ChildHeader | null;
  usage: ChildUsageSummary | null;
  dailyLimit: number | null;
  online: boolean;
  lastSeen: string | null;
}

export default function HomeScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const unreadCount = useUnreadNotificationCount();
  const firstRunRef = useRef(true);

  const [tutorName, setTutorName] = useState('');
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [children, setChildren] = useState<ChildProfile[]>([]);
  const [details, setDetails] = useState<Record<string, HomeChildData>>({});
  const [locationRows, setLocationRows] = useState<ChildLocation[]>([]);
  const [alertItems, setAlertItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [childSelectVisible, setChildSelectVisible] = useState(false);
  const [childSelectAction, setChildSelectAction] = useState<'block' | 'alert' | null>(null);
  const [addTimeChild, setAddTimeChild] = useState<ChildProfile | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { family, profile } = await familyService.getMyFamily();
      if (!family.id) {
        setFamilyId(null);
        setTutorName(profile.displayName.trim() || 'NOE');
        setChildren([]);
        setDetails({});
        setLocationRows([]);
        setAlertItems([]);
        setError(null);
        setReady(true);
        return;
      }
      setFamilyId(family.id);
      const emailPrefix = (profile.email ?? '').split('@')[0]?.trim() ?? '';
      setTutorName(profile.displayName.trim() || emailPrefix || 'NOE');

      const kids = await childService.listChildren(family.id);
      setChildren(kids);

      const [locs, notifs] = await Promise.all([
        deviceControlService.getChildrenLocations().catch((): ChildLocation[] => []),
        notificationsService.list().catch((): Notification[] => []),
      ]);
      setLocationRows(locs);
      setAlertItems(notifs.filter((n) => n.type === 'sos' || n.type === 'geofence'));

      const locMap = new Map(locs.map((l) => [l.childId, l]));
      const entries = await Promise.all(
        kids.map(async (kid): Promise<[string, HomeChildData]> => {
          const [header, usage, rules] = await Promise.all([
            controlService.getChildHeader(kid.id).catch((): ChildHeader | null => null),
            activityService.getChildUsageByPackage(kid.id, 1).catch((): ChildUsageSummary | null => null),
            parentalService.getRulesByChild(kid.id).catch(() => null),
          ]);
          const location = locMap.get(kid.id) ?? null;
          return [
            kid.id,
            {
              location,
              header,
              usage,
              dailyLimit: rules?.dailyLimitMinutes ?? null,
              online: location ? location.isOnline : (header?.online ?? false),
              lastSeen: location?.locationUpdatedAt ?? header?.lastSeen ?? null,
            },
          ];
        }),
      );
      setDetails(Object.fromEntries(entries));
      setError(null);
      setReady(true);
    } catch (cause) {
      if (!isRefresh) setError(errorMessage(cause));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const first = firstRunRef.current;
      firstRunRef.current = false;
      fetchData(!first);
      pinSyncService.syncCurrentPin();
    }, [fetchData]),
  );

  const handleRefresh = useCallback(() => fetchData(true), [fetchData]);

  const handleChildSelect = useCallback(
    (childId: string) => {
      setChildSelectVisible(false);
      setTimeout(() => {
        (async () => {
          if (childSelectAction === 'block') {
            try {
              await deviceControlService.blockChild(childId);
              Alert.alert(
                tr('noe.dashboard.deviceBlockedTitle'),
                tr('noe.dashboard.deviceBlockedMessage'),
              );
            } catch {
              Alert.alert(tr('noe.dashboard.errorTitle'), tr('noe.dashboard.blockFailedMessage'));
            }
          } else if (childSelectAction === 'alert') {
            try {
              await deviceControlService.triggerAlert(childId);
              Alert.alert(
                tr('noe.dashboard.alertActivatedTitle'),
                tr('noe.dashboard.alertActivatedMessage'),
              );
            } catch {
              Alert.alert(tr('noe.dashboard.errorTitle'), tr('noe.dashboard.alertFailedMessage'));
            }
          }
          setChildSelectAction(null);
        })();
      }, 0);
    },
    [childSelectAction, tr],
  );

  const handleAddTime = useCallback(
    async (child: ChildProfile, minutes: number) => {
      setAddTimeChild(null);
      if (!familyId) return;
      try {
        const rules = await parentalService.getRulesByChild(child.id).catch(() => null);
        const current = rules?.dailyLimitMinutes ?? 0;
        const next = Math.min(current + minutes, MAX_DAILY_LIMIT_MINUTES);
        await parentalService.saveRules(familyId, child.id, { dailyLimitMinutes: next });
        Alert.alert(
          tr('noe.home.addTime'),
          tr('noe.home.timeUpdated', { minutes, name: child.displayName, limit: next }),
        );
        fetchData(true);
      } catch {
        Alert.alert(tr('noe.home.addTime'), tr('noe.home.timeUpdateError'));
      }
    },
    [familyId, fetchData, tr],
  );

  const goDetail = useCallback(
    (childId: string) => {
      router.push({ pathname: '/children/[childId]', params: { childId } } as any);
    },
    [router],
  );

  /* ── Derived state (solo datos reales; lo ausente se oculta) ── */
  const total = children.length;
  const onlineKids = children.filter((k) => details[k.id]?.online ?? false);
  const onlineCount = onlineKids.length;
  const isLinked =
    locationRows.length > 0 || children.some((k) => details[k.id]?.header != null);
  const totalMinutes = children.reduce(
    (sum, k) => sum + (details[k.id]?.usage?.totalMinutes ?? 0),
    0,
  );
  const alertCount = alertItems.length;
  const firstChild = children[0] ?? null;
  const firstName = firstChild?.displayName ?? '';

  const subtitle = !isLinked
    ? tr('noe.home.setupSubtitle')
    : onlineCount === 1
      ? tr('noe.home.onlineNow', { name: onlineKids[0]?.displayName ?? '' })
      : onlineCount > 1
        ? tr('noe.home.onlineCount', { online: onlineCount, total })
        : tr('noe.home.allOffline');

  const openChildSelect = (action: 'block' | 'alert') => {
    if (!isLinked || children.length === 0) return;
    setChildSelectAction(action);
    setChildSelectVisible(true);
  };

  const goLinking = () => {
    if (firstChild) {
      router.push({ pathname: ROUTES.linking, params: { childId: firstChild.id } } as any);
    } else {
      router.push(ROUTES.linking as any);
    }
  };

  /* ── Loading / Error ── */
  if (!ready && loading) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('common.loading')} />
      </View>
    );
  }

  if (!ready && error) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error} onRetry={() => fetchData(false)} />
      </View>
    );
  }

  /* ── Render ── */
  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, { paddingTop: screenPadding.paddingTop }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('noe.home.openProfile')}
            style={({ pressed }) => [styles.headerLeft, pressed && styles.pressed]}
            onPress={() => router.push(ROUTES.profile as any)}
          >
            <Avatar name={tutorName} size={48} style={{ backgroundColor: colors.success }} />
            <View style={styles.headerText}>
              <Text style={styles.greeting} numberOfLines={1}>
                {tr('noe.home.greeting', { name: tutorName })}
              </Text>
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('noe.tabs.notifications')}
            hitSlop={8}
            style={({ pressed }) => [styles.bell, pressed && styles.pressed]}
            onPress={() => router.push(ROUTES.notifications as any)}
          >
            <MaterialIcons name="notifications" size={22} color={colors.text} />
            {unreadCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* ── KPIs ── */}
        <View style={styles.kpiRow}>
          <HomeKpi
            icon="wifi"
            value={`${onlineCount}/${total}`}
            label={tr('noe.home.kpiOnline')}
            color={onlineCount > 0 ? colors.success : colors.textMuted}
            onPress={() => router.push(ROUTES.children as any)}
          />
          <HomeKpi
            icon="schedule"
            value={formatDuration(totalMinutes)}
            label={tr('noe.home.kpiTime')}
            color={colors.primary}
            onPress={() => router.push(ROUTES.activity as any)}
          />
          <HomeKpi
            icon={alertCount > 0 ? 'warning' : 'check-circle'}
            value={String(alertCount)}
            label={tr('noe.home.kpiAlerts')}
            color={alertCount > 0 ? colors.warning : colors.success}
            onPress={() => router.push('/activity/alertas' as any)}
          />
        </View>

        {isLinked ? (
          <>
            {/* ── Acciones rápidas ── */}
            <View style={styles.group}>
              <Text style={styles.groupTitle}>{tr('noe.home.quickActions')}</Text>
              <View style={styles.qaRow}>
                <QuickActionButton
                  icon="lock"
                  label={tr('noe.home.actionBlock')}
                  color={colors.danger}
                  disabled={children.length === 0}
                  onPress={() => openChildSelect('block')}
                />
                <QuickActionButton
                  icon="notifications-active"
                  label={tr('noe.home.actionAlert')}
                  color={colors.warning}
                  disabled={children.length === 0}
                  onPress={() => openChildSelect('alert')}
                />
              </View>
              <View style={styles.qaRow}>
                <QuickActionButton
                  icon="location-searching"
                  label={tr('noe.home.actionLocate')}
                  color={colors.success}
                  onPress={() => router.push('/location' as any)}
                />
                <QuickActionButton
                  icon="school"
                  label={tr('noe.home.actionStudy')}
                  color={colors.primary}
                  onPress={() => router.push('/rules/modo-estudio' as any)}
                />
              </View>
            </View>

            {/* ── Mis hijos ── */}
            {children.length > 0 ? (
              <View style={styles.group}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>{tr('noe.home.myChildren')}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tr('noe.home.seeAll')}
                    hitSlop={8}
                    style={styles.seeAllHit}
                    onPress={() => router.push(ROUTES.children as any)}
                  >
                    <Text style={styles.seeAll}>{tr('noe.home.seeAll')}</Text>
                  </Pressable>
                </View>
                {children.map((kid) => {
                  const info = details[kid.id];
                  if (!info) return null;
                  return info.online ? (
                    <OnlineChildCard
                      key={kid.id}
                      child={kid}
                      info={info}
                      onDetail={goDetail}
                      onAddTime={setAddTimeChild}
                    />
                  ) : (
                    <OfflineChildCard key={kid.id} child={kid} info={info} />
                  );
                })}
              </View>
            ) : null}
          </>
        ) : (
          <>
            {/* ── Termina de configurar ── */}
            <SetupCard
              firstName={firstName}
              hasChild={children.length > 0}
              onLink={goLinking}
            />

            {/* ── Acciones deshabilitadas ── */}
            <View style={styles.group}>
              <Text style={styles.groupTitle}>{tr('noe.home.quickActions')}</Text>
              <View style={styles.qaRow}>
                <QuickActionButton
                  icon="lock"
                  label={tr('noe.home.actionBlock')}
                  color={colors.textMuted}
                  disabled
                />
                <QuickActionButton
                  icon="notifications-active"
                  label={tr('noe.home.actionAlert')}
                  color={colors.textMuted}
                  disabled
                />
              </View>
              <View style={styles.qaRow}>
                <QuickActionButton
                  icon="location-searching"
                  label={tr('noe.home.actionLocate')}
                  color={colors.textMuted}
                  disabled
                />
                <QuickActionButton
                  icon="school"
                  label={tr('noe.home.actionStudy')}
                  color={colors.textMuted}
                  disabled
                />
              </View>
              <Text style={styles.disabledNote}>{tr('noe.home.actionsDisabledNote')}</Text>
            </View>

            {/* ── Mis hijos (sin vincular) ── */}
            {children.length > 0 ? (
              <View style={styles.group}>
                <View style={styles.sectionHead}>
                  <Text style={styles.sectionTitle}>{tr('noe.home.myChildren')}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={tr('noe.home.seeAll')}
                    hitSlop={8}
                    style={styles.seeAllHit}
                    onPress={() => router.push(ROUTES.children as any)}
                  >
                    <Text style={styles.seeAll}>{tr('noe.home.seeAll')}</Text>
                  </Pressable>
                </View>
                {children.map((kid) => (
                  <UnlinkedChildCard key={kid.id} child={kid} />
                ))}
              </View>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* ── Modal: elegir hijo (bloquear / alerta) ── */}
      <ChildSelectModal
        visible={childSelectVisible}
        childList={children}
        onClose={() => {
          setChildSelectVisible(false);
          setTimeout(() => setChildSelectAction(null), 0);
        }}
        onSelect={handleChildSelect}
      />

      {/* ── Modal: +Tiempo (suma al daily_limit) ── */}
      <AddTimeModal
        child={addTimeChild}
        visible={addTimeChild !== null}
        onClose={() => setAddTimeChild(null)}
        onPick={handleAddTime}
      />
    </View>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function HomeKpi({
  icon,
  value,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.kpi, pressed && styles.pressed]}
      onPress={onPress}
    >
      <View style={[styles.kpiIcon, { backgroundColor: `${color}18` }]}>
        <MaterialIcons name={icon} size={16} color={color} />
      </View>
      <Text style={styles.kpiValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.kpiLabel} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

function QuickActionButton({
  icon,
  label,
  color,
  disabled = false,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  color: string;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[styles.qaBtn, disabled && styles.qaBtnDisabled]}
      onPress={onPress}
    >
      <View
        style={[
          styles.qaIcon,
          { backgroundColor: disabled ? colors.borderLight : `${color}18` },
        ]}
      >
        <MaterialIcons name={icon} size={20} color={disabled ? colors.textMuted : color} />
      </View>
      <Text style={styles.qaLabel} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

function ChildSelectModal({
  visible,
  childList,
  onClose,
  onSelect,
}: {
  visible: boolean;
  childList: ChildProfile[];
  onClose: () => void;
  onSelect: (childId: string) => void;
}) {
  const { colors } = useTheme();
  const { t: tr } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>{tr('noe.home.selectChild')}</Text>
          <FlatList
            data={childList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.displayName}
                style={styles.modalChildRow}
                onPress={() => onSelect(item.id)}
              >
                <Avatar3D id={item.avatarUrl ?? undefined} size={40} />
                <Text style={styles.modalChildName}>{item.displayName}</Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('common.cancel')}
            style={styles.modalCancelButton}
            onPress={onClose}
          >
            <Text style={styles.modalCancelText}>{tr('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AddTimeModal({
  child,
  visible,
  onClose,
  onPick,
}: {
  child: ChildProfile | null;
  visible: boolean;
  onClose: () => void;
  onPick: (child: ChildProfile, minutes: number) => void;
}) {
  const { colors } = useTheme();
  const { t: tr } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (!child) return null;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>
            {tr('noe.home.addTimeTitle', { name: child.displayName })}
          </Text>
          {ADD_TIME_OPTIONS.map((m) => (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityLabel={tr('noe.home.addTimeOption', { minutes: m })}
              style={({ pressed }) => [styles.addTimeOption, pressed && styles.pressed]}
              onPress={() => onPick(child, m)}
            >
              <Text style={styles.addTimeOptionText}>
                {tr('noe.home.addTimeOption', { minutes: m })}
              </Text>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={tr('common.cancel')}
            style={styles.modalCancelButton}
            onPress={onClose}
          >
            <Text style={styles.modalCancelText}>{tr('common.cancel')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OnlineChildCard({
  child,
  info,
  onDetail,
  onAddTime,
}: {
  child: ChildProfile;
  info: HomeChildData;
  onDetail: (childId: string) => void;
  onAddTime: (child: ChildProfile) => void;
}) {
  const { colors } = useTheme();
  const { t: tr } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const used = info.usage?.totalMinutes ?? 0;
  const limitValue = info.dailyLimit;
  const hasLimit = limitValue != null && limitValue > 0;
  const pct: string | null =
    limitValue != null && limitValue > 0
      ? `${Math.round((used / limitValue) * 100)}%`
      : null;

  const currentAppRaw = info.header?.currentApp?.trim() ?? '';
  const currentApp = currentAppRaw ? friendlyAppName(currentAppRaw) : null;
  const statusText = currentApp
    ? `${tr('noe.home.online')} · ${tr('noe.home.usingApp', { app: currentApp })}`
    : tr('noe.home.online');

  const chips: string[] = [];
  const battery = info.header?.battery;
  if (typeof battery === 'number') {
    chips.push(tr('noe.home.battery', { value: Math.round(battery) }));
  }
  const ringer = info.header?.ringerMode;
  if (ringer === 'normal') chips.push(tr('noe.control.soundNormal'));
  else if (ringer === 'vibrate') chips.push(tr('noe.control.soundVibrate'));
  else if (ringer === 'silent') chips.push(tr('noe.control.soundSilent'));
  if (info.lastSeen) chips.push(relativeTime(info.lastSeen));

  const topApps = (info.usage?.packageUsages ?? []).slice(0, 3);
  const maxTop = topApps[0]?.minutes || 1;

  return (
    <Card style={styles.childCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={child.displayName}
        style={({ pressed }) => [pressed && styles.pressed]}
        onPress={() => onDetail(child.id)}
      >
        <View style={styles.childTop}>
          <Avatar3D id={child.avatarUrl ?? undefined} size={52} />
          <View style={styles.childInfo}>
            <Text style={styles.childName} numberOfLines={1}>
              {child.displayName}
            </Text>
            <View style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.statusText} numberOfLines={1}>
                {statusText}
              </Text>
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={20} color={colors.textMuted} />
        </View>
      </Pressable>

      {chips.length > 0 ? (
        <View style={styles.chips}>
          {chips.map((chip) => (
            <View key={chip} style={styles.chip}>
              <Text style={styles.chipText}>{chip}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.progressHead}>
        <Text style={styles.progressLabel}>
          {hasLimit && limitValue != null
            ? tr('noe.home.todayOf', {
                used: formatDuration(used),
                limit: formatDuration(limitValue),
              })
            : tr('noe.home.todayUsed', { used: formatDuration(used) })}
        </Text>
        {pct ? <Text style={styles.progressPct}>{pct}</Text> : null}
      </View>
      {hasLimit && limitValue != null ? (
        <View style={styles.barWrap}>
          <ProgressBar value={used} max={limitValue} height={10} />
        </View>
      ) : null}

      {topApps.length > 0 ? (
        <View style={styles.topApps}>
          <Text style={styles.topTitle}>{tr('noe.home.topApps')}</Text>
          {topApps.map((app) => {
            const cat = categoryForPackage(app.packageName);
            const tint = cat?.color ?? colors.primary;
            const ratio = Math.min(app.minutes / maxTop, 1);
            return (
              <View key={app.packageName} style={styles.appRow}>
                <View style={[styles.appIcon, { backgroundColor: `${tint}18` }]}>
                  <MaterialIcons
                    name={(cat?.icon ?? 'apps') as keyof typeof MaterialIcons.glyphMap}
                    size={16}
                    color={tint}
                  />
                </View>
                <Text style={styles.appName} numberOfLines={1}>
                  {friendlyAppName(app.packageName, app.appLabel)}
                </Text>
                <View style={styles.miniBar}>
                  <View style={[styles.miniFill, { flex: ratio }]} />
                  <View style={{ flex: 1 - ratio }} />
                </View>
                <Text style={styles.appMinutes}>
                  {tr('noe.home.minutesShort', { minutes: app.minutes })}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={styles.childActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('noe.home.addTime')}
          hitSlop={{ top: 4, bottom: 4 }}
          style={({ pressed }) => [styles.addTimeBtn, pressed && styles.pressed]}
          onPress={() => onAddTime(child)}
        >
          <Text style={styles.addTimeText}>{tr('noe.home.addTime')}</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={tr('noe.home.details')}
          hitSlop={{ top: 4, bottom: 4 }}
          style={({ pressed }) => [styles.detailsBtn, pressed && styles.pressed]}
          onPress={() => onDetail(child.id)}
        >
          <Text style={styles.detailsText}>{tr('noe.home.details')}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function OfflineChildCard({
  child,
  info,
}: {
  child: ChildProfile;
  info: HomeChildData;
}) {
  const { colors } = useTheme();
  const { t: tr } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const used = info.usage?.totalMinutes ?? 0;
  const limitValue = info.dailyLimit;
  const hasLimit = limitValue != null && limitValue > 0;
  const pct: string | null =
    limitValue != null && limitValue > 0
      ? `${Math.round((used / limitValue) * 100)}%`
      : null;

  return (
    <Card style={styles.childCard}>
      <View style={styles.childTop}>
        <Avatar3D id={child.avatarUrl ?? undefined} size={44} />
        <View style={styles.childInfo}>
          <Text style={styles.childName} numberOfLines={1}>
            {child.displayName}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: colors.textMuted }]} />
            <Text style={styles.statusText} numberOfLines={1}>
              {tr('noe.home.offlineStatus', { time: relativeTime(info.lastSeen) })}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.progressHead}>
        <Text style={styles.progressLabel}>
          {hasLimit && limitValue != null
            ? tr('noe.home.todayOf', {
                used: formatDuration(used),
                limit: formatDuration(limitValue),
              })
            : tr('noe.home.todayUsed', { used: formatDuration(used) })}
        </Text>
        {pct ? <Text style={styles.progressPct}>{pct}</Text> : null}
      </View>
      {hasLimit && limitValue != null ? (
        <View style={styles.barWrap}>
          <ProgressBar value={used} max={limitValue} height={10} />
        </View>
      ) : null}
    </Card>
  );
}

function UnlinkedChildCard({ child }: { child: ChildProfile }) {
  const { colors } = useTheme();
  const { t: tr } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Card style={styles.childCard}>
      <View style={styles.childTop}>
        <Avatar3D id={child.avatarUrl ?? undefined} size={44} />
        <View style={styles.childInfo}>
          <Text style={styles.childName} numberOfLines={1}>
            {child.displayName}
          </Text>
          <View style={styles.statusRow}>
            <View style={[styles.dot, { backgroundColor: colors.warning }]} />
            <Text style={styles.statusText} numberOfLines={1}>
              {tr('noe.home.unlinkedStatus')}
            </Text>
          </View>
        </View>
      </View>
    </Card>
  );
}

function SetupCard({
  firstName,
  hasChild,
  onLink,
}: {
  firstName: string;
  hasChild: boolean;
  onLink: () => void;
}) {
  const { colors } = useTheme();
  const { t: tr } = useTranslation();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const doneCount = hasChild ? 1 : 0;
  return (
    <Card style={styles.setupCard}>
      <View style={styles.setupHead}>
        <Text style={styles.setupTitle}>{tr('noe.home.setupCardTitle')}</Text>
        <View style={styles.setupPill}>
          <Text style={styles.setupPillText}>
            {tr('noe.home.setupStepCount', { done: doneCount, total: 3 })}
          </Text>
        </View>
      </View>
      <View style={styles.segments}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={[styles.segment, i < doneCount && styles.segmentDone]}
          />
        ))}
      </View>
      <View style={styles.stepRow}>
        <View
          style={[
            styles.stepCircle,
            { backgroundColor: hasChild ? colors.success : colors.primary },
          ]}
        >
          {hasChild ? (
            <MaterialIcons name="check" size={18} color={colors.onPrimary} />
          ) : (
            <Text style={styles.stepCircleText}>1</Text>
          )}
        </View>
        <View style={styles.stepInfo}>
          <Text style={styles.stepTitle}>
            {hasChild
              ? tr('noe.home.step1Done', { name: firstName })
              : tr('noe.home.step1Pending')}
          </Text>
          <Text style={styles.stepDesc}>{tr('noe.home.step1DescDone')}</Text>
        </View>
      </View>
      <View style={styles.stepRow}>
        <View style={[styles.stepCircle, { backgroundColor: colors.primary }]}>
          <Text style={styles.stepCircleText}>2</Text>
        </View>
        <View style={styles.stepInfo}>
          <Text style={styles.stepTitle}>{tr('noe.home.step2Title')}</Text>
          <Text style={styles.stepDesc}>
            {hasChild
              ? tr('noe.home.step2Desc', { name: firstName })
              : tr('noe.home.step2DescGeneric')}
          </Text>
        </View>
      </View>
      <View style={styles.stepRow}>
        <View style={[styles.stepCircle, { backgroundColor: colors.border }]}>
          <Text style={[styles.stepCircleText, { color: colors.textMuted }]}>3</Text>
        </View>
        <View style={styles.stepInfo}>
          <Text style={styles.stepTitle}>{tr('noe.home.step3Title')}</Text>
          <Text style={styles.stepDesc}>{tr('noe.home.step3Desc')}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={tr('noe.home.generateCode')}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        onPress={onLink}
      >
        <MaterialIcons name="link" size={20} color={colors.onPrimary} />
        <Text style={styles.ctaText}>{tr('noe.home.generateCode')}</Text>
      </Pressable>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES (solo tokens del theme; sin sombras fuertes)
   ═══════════════════════════════════════════════════════════════════════════ */

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: 20,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    pressed: {
      opacity: 0.75,
    },

    /* ── Header ── */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
      minHeight: 48,
    },
    headerText: {
      flex: 1,
      gap: 2,
    },
    greeting: {
      fontFamily: typography.fontFamily.heading,
      fontSize: 20,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    subtitle: {
      fontFamily: typography.fontFamily.body,
      fontSize: 14,
      color: colors.textSoft,
    },
    bell: {
      width: 46,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      position: 'relative',
    },
    badge: {
      position: 'absolute',
      top: -2,
      right: -2,
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.danger,
      borderWidth: 2,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: typography.fontWeights.bold,
      color: colors.onPrimary,
    },

    /* ── KPIs ── */
    kpiRow: {
      flexDirection: 'row',
      gap: 10,
    },
    kpi: {
      flex: 1,
      minHeight: 96,
      borderRadius: 16,
      padding: 12,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    kpiIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kpiValue: {
      fontFamily: typography.fontFamily.heading,
      fontSize: 22,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    kpiLabel: {
      fontFamily: typography.fontFamily.body,
      fontSize: 13,
      color: colors.textSoft,
    },

    /* ── Groups ── */
    group: {
      gap: 10,
    },
    groupTitle: {
      fontFamily: typography.fontFamily.body,
      fontSize: 12,
      fontWeight: typography.fontWeights.bold,
      letterSpacing: 0.96,
      textTransform: 'uppercase',
      color: colors.textSoft,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontFamily: typography.fontFamily.heading,
      fontSize: 17,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    seeAllHit: {
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    seeAll: {
      fontSize: 14,
      fontWeight: typography.fontWeights.bold,
      color: colors.primary,
    },

    /* ── Quick actions ── */
    qaRow: {
      flexDirection: 'row',
      gap: 10,
    },
    qaBtn: {
      flex: 1,
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    qaBtnDisabled: {
      opacity: 0.55,
    },
    qaIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    qaLabel: {
      flex: 1,
      fontFamily: typography.fontFamily.body,
      fontSize: 14,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
      lineHeight: 18,
    },
    disabledNote: {
      fontFamily: typography.fontFamily.body,
      fontSize: 13,
      color: colors.textSoft,
      lineHeight: 18,
    },

    /* ── Child cards ── */
    childCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 12,
    },
    childTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      minHeight: 52,
    },
    childInfo: {
      flex: 1,
      gap: 4,
    },
    childName: {
      fontFamily: typography.fontFamily.heading,
      fontSize: 17,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    statusText: {
      flex: 1,
      fontFamily: typography.fontFamily.body,
      fontSize: 13,
      fontWeight: typography.fontWeights.medium,
      color: colors.textSoft,
    },
    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      backgroundColor: colors.background,
      borderRadius: radius.full,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    chipText: {
      fontFamily: typography.fontFamily.body,
      fontSize: 12.5,
      fontWeight: typography.fontWeights.semibold,
      color: colors.textSecondary,
    },
    progressHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    progressLabel: {
      fontFamily: typography.fontFamily.body,
      fontSize: 14,
      fontWeight: typography.fontWeights.medium,
      color: colors.text,
      flex: 1,
    },
    progressPct: {
      fontFamily: typography.fontFamily.heading,
      fontSize: 16,
      fontWeight: typography.fontWeights.semibold,
      color: colors.primary,
    },
    barWrap: {
      backgroundColor: colors.border,
      borderRadius: radius.full,
      padding: 2,
    },
    topApps: {
      gap: 4,
    },
    topTitle: {
      fontFamily: typography.fontFamily.body,
      fontSize: 12,
      fontWeight: typography.fontWeights.bold,
      letterSpacing: 0.96,
      textTransform: 'uppercase',
      color: colors.textSoft,
      marginBottom: 4,
    },
    appRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 4,
      minHeight: 40,
    },
    appIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    appName: {
      flex: 1,
      fontFamily: typography.fontFamily.body,
      fontSize: 14.5,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    miniBar: {
      width: 64,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
      overflow: 'hidden',
      flexDirection: 'row',
    },
    miniFill: {
      height: 6,
      backgroundColor: colors.primary,
    },
    appMinutes: {
      fontFamily: typography.fontFamily.body,
      fontSize: 12.5,
      fontWeight: typography.fontWeights.semibold,
      color: colors.textSecondary,
      minWidth: 52,
      textAlign: 'right',
    },
    childActions: {
      flexDirection: 'row',
      gap: 10,
    },
    addTimeBtn: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addTimeText: {
      fontSize: 15,
      fontWeight: typography.fontWeights.semibold,
      color: colors.onPrimary,
    },
    detailsBtn: {
      flex: 1,
      height: 46,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    detailsText: {
      fontSize: 15,
      fontWeight: typography.fontWeights.semibold,
      color: colors.primary,
    },

    /* ── Setup card ── */
    setupCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 16,
      gap: 14,
    },
    setupHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    setupTitle: {
      fontFamily: typography.fontFamily.heading,
      fontSize: 17,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
      flex: 1,
    },
    setupPill: {
      backgroundColor: colors.primaryLight,
      borderRadius: radius.full,
      paddingVertical: 4,
      paddingHorizontal: 10,
    },
    setupPillText: {
      fontSize: 12,
      fontWeight: typography.fontWeights.bold,
      color: colors.primary,
    },
    segments: {
      flexDirection: 'row',
      gap: 6,
    },
    segment: {
      flex: 1,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.border,
    },
    segmentDone: {
      backgroundColor: colors.primary,
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    stepCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCircleText: {
      fontSize: 14,
      fontWeight: typography.fontWeights.bold,
      color: colors.onPrimary,
    },
    stepInfo: {
      flex: 1,
      gap: 2,
    },
    stepTitle: {
      fontFamily: typography.fontFamily.body,
      fontSize: 15,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    stepDesc: {
      fontFamily: typography.fontFamily.body,
      fontSize: 13,
      color: colors.textSoft,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      height: 50,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    ctaText: {
      fontSize: 16,
      fontWeight: typography.fontWeights.semibold,
      color: colors.onPrimary,
    },

    /* ── Modals ── */
    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      width: '100%',
      maxWidth: 400,
      maxHeight: '70%',
      gap: spacing.sm,
    },
    modalTitle: {
      fontFamily: typography.fontFamily.heading,
      fontSize: 17,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    modalChildRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 56,
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
      marginTop: spacing.sm,
      minHeight: 48,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalCancelText: {
      fontSize: typography.fontSizes.body,
      color: colors.textSecondary,
      fontWeight: typography.fontWeights.medium,
    },
    addTimeOption: {
      minHeight: 50,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addTimeOptionText: {
      fontSize: 16,
      fontWeight: typography.fontWeights.semibold,
      color: colors.primary,
    },
  });
