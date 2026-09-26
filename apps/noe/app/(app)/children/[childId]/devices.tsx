import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { ROUTES } from '@/constants';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import {
  deviceControlService,
} from '@/features/device-control/services/device-control-service';
import { requireSupabaseClient } from '@noe-arcakids/supabase';
import {
  Card,
  errorMessage,
  useAsyncData,
  useTheme,
  radius,
  spacing,
  typography,
  type ThemeColors,
  type ThemeShadows,
} from '@noe-arcakids/shared';

interface DeviceRow {
  id: string;
  deviceUuid: string;
  name: string | null;
  platform: string;
  appVersion: string | null;
  lastSeenAt: string | null;
  isBlocked: boolean;
  battery: number | null;
  lastSeen: string | null;
  isLocked: boolean;
  alertActive: boolean;
}

export default function DevicesScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const { childId } = useLocalSearchParams<{ childId: string }>();
  const screenPadding = useScreenPadding();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);

  const fetchChild = useCallback(async () => {
    const { family } = await familyService.getMyFamily();
    const list = await childService.listChildren(family.id);
    const child = list.find((c) => c.id === childId);
    if (!child) throw new Error(tr('noe.children.notFound'));
    return child;
  }, [childId, tr]);

  const { data: child, error: childError, loading: childLoading, reload: reloadChild } = useAsyncData(fetchChild);

  const fetchDevices = useCallback(async (): Promise<DeviceRow[]> => {
    if (!childId) return [];
    const client = requireSupabaseClient();
    const { data: devs, error: devsErr } = await client
      .from('devices')
      .select('id, device_uuid, name, platform, app_version, last_seen_at, is_blocked')
      .eq('child_id', childId)
      .order('last_seen_at', { ascending: false });
    if (devsErr) throw new Error(devsErr.message);
    const list = (devs ?? []) as {
      id: string;
      device_uuid: string;
      name: string | null;
      platform: string;
      app_version: string | null;
      last_seen_at: string | null;
      is_blocked: boolean;
    }[];
    if (list.length === 0) return [];

    const uuids = list.map((d) => d.device_uuid);
    const { data: statusRows } = await client
      .from('device_status')
      .select('device_uuid, last_seen, battery, is_locked')
      .in('device_uuid', uuids);
    const statusMap = new Map<
      string,
      { lastSeen: string | null; battery: number | null; isLocked: boolean }
    >();
    for (const row of statusRows ?? []) {
      statusMap.set(row.device_uuid as string, {
        lastSeen: (row.last_seen as string | null) ?? null,
        battery: (row.battery as number | null) ?? null,
        isLocked: Boolean(row.is_locked),
      });
    }
    return list.map((d) => {
      const st = statusMap.get(d.device_uuid);
      return {
        id: d.id,
        deviceUuid: d.device_uuid,
        name: d.name,
        platform: d.platform,
        appVersion: d.app_version,
        lastSeenAt: d.last_seen_at,
        isBlocked: d.is_blocked,
        battery: st?.battery ?? null,
        lastSeen: st?.lastSeen ?? d.last_seen_at,
        isLocked: st?.isLocked ?? false,
        alertActive: false,
      };
    });
  }, [childId]);

  const {
    data: devices,
    error: devicesError,
    loading: devicesLoading,
    reload: reloadDevices,
  } = useAsyncData(fetchDevices);

  useFocusEffect(
    useCallback(() => {
      reloadDevices();
    }, [reloadDevices])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([reloadChild(), reloadDevices()]);
    setRefreshing(false);
  }, [reloadChild, reloadDevices]);

  async function runDeviceAction(
    deviceUuid: string,
    kind: 'lock' | 'unlock' | 'location',
  ) {
    setCommandLoading(`${deviceUuid}-${kind}`);
    setActionError(null);
    try {
      if (kind === 'lock') await deviceControlService.lockDevice(deviceUuid);
      else if (kind === 'unlock') await deviceControlService.unlockDevice(deviceUuid);
      else if (kind === 'location') await deviceControlService.requestLocation(deviceUuid);
      Alert.alert(
        'Comando enviado',
        kind === 'location'
          ? 'Se solicitó la ubicación del dispositivo.'
          : `Comando ${kind === 'lock' ? 'bloquear' : 'desbloquear'} enviado.`,
      );
      setTimeout(() => void reloadDevices(), 2000);
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setCommandLoading(null);
    }
  }

  if (childLoading) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('common.loading')} />
      </View>
    );
  }
  if (childError || !child) {
    return (
      <View style={styles.screen}>
        <ErrorState message={childError ?? tr('common.unexpected')} onRetry={reloadChild} />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      <Pressable
        style={styles.headerRow}
        onPress={() => router.replace({ pathname: '/children/[childId]', params: { childId } })}
      >
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>Dispositivos de {child.displayName}</Text>
      </Pressable>

      {devicesLoading ? (
        <LoadingState text={tr('common.loading')} />
      ) : devicesError ? (
        <ErrorState message={devicesError} onRetry={reloadDevices} />
      ) : (devices?.length ?? 0) === 0 ? (
        <EmptyState
          icon="smartphone"
          title="Sin dispositivos vinculados"
          description="Vincula el primer dispositivo de este hijo para comenzar a controlarlo."
          action={{
            label: 'Vincular dispositivo',
            onPress: () =>
              router.push({ pathname: ROUTES.linking, params: { childId } } as any),
          }}
        />
      ) : (
        <>
          <Text style={styles.sectionLabel}>
            {devices?.length} dispositivo{devices?.length === 1 ? '' : 's'}
          </Text>

          {devices?.map((dev) => (
            <Card key={dev.id} style={styles.card}>
              <View style={styles.deviceTop}>
                <View style={styles.deviceIcon}>
                  <MaterialIcons
                    name={dev.platform === 'ios' ? 'phone-iphone' : 'phone-android'}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <View style={styles.deviceInfo}>
                  <Text style={styles.deviceName} numberOfLines={1}>
                    {dev.name ?? `Dispositivo ${dev.deviceUuid.slice(0, 8)}`}
                  </Text>
                  <Text style={styles.deviceMeta}>
                    {dev.platform}
                    {dev.appVersion ? ` · v${dev.appVersion}` : ''}
                  </Text>
                </View>
                {dev.isBlocked ? (
                  <View style={[styles.badge, styles.badgeBlocked]}>
                    <MaterialIcons name="block" size={11} color={colors.danger} />
                    <Text style={[styles.badgeText, styles.badgeTextBlocked]}>Bloqueado</Text>
                  </View>
                ) : null}
                {dev.isLocked ? (
                  <View style={[styles.badge, styles.badgeLocked]}>
                    <MaterialIcons name="lock" size={11} color={colors.warning} />
                    <Text style={[styles.badgeText, styles.badgeTextLocked]}>Bloqueo</Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.statusRow}>
                {dev.battery !== null ? (
                  <View style={styles.statusItem}>
                    <MaterialIcons
                      name={dev.battery > 20 ? 'battery-full' : 'battery-alert'}
                      size={16}
                      color={dev.battery > 20 ? colors.success : colors.warning}
                    />
                    <Text style={styles.statusText}>{dev.battery}%</Text>
                  </View>
                ) : null}
                {dev.lastSeen ? (
                  <View style={styles.statusItem}>
                    <MaterialIcons name="schedule" size={16} color={colors.textMuted} />
                    <Text style={styles.statusText}>
                      {new Date(dev.lastSeen).toLocaleString()}
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.actions}>
                <Button
                  size="sm"
                  loading={commandLoading === `${dev.deviceUuid}-lock`}
                  onPress={() => runDeviceAction(dev.deviceUuid, 'lock')}
                  disabled={dev.isLocked}
                >
                  Bloquear
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={commandLoading === `${dev.deviceUuid}-unlock`}
                  onPress={() => runDeviceAction(dev.deviceUuid, 'unlock')}
                  disabled={!dev.isLocked}
                >
                  Desbloquear
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={commandLoading === `${dev.deviceUuid}-location`}
                  onPress={() => runDeviceAction(dev.deviceUuid, 'location')}
                >
                  Ubicar
                </Button>
              </View>
            </Card>
          ))}
        </>
      )}

      {actionError ? <Text style={styles.error}>{actionError}</Text> : null}

      <Button
        variant="secondary"
        onPress={() =>
          router.push({ pathname: ROUTES.linking, params: { childId } } as any)
        }
        icon={<MaterialIcons name="link" size={18} color={colors.primary} />}
      >
        Vincular otro dispositivo
      </Button>
    </ScrollView>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
    screen: {
      padding: spacing.lg,
      paddingTop: spacing.xxl,
      backgroundColor: colors.surface,
      gap: spacing.md,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerTitle: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    sectionLabel: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.medium,
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    card: {
      gap: spacing.md,
      ...shadows.sm,
    },
    deviceTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    deviceIcon: {
      width: 44,
      height: 44,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryLight,
    },
    deviceInfo: {
      flex: 1,
      gap: 2,
    },
    deviceName: {
      fontSize: typography.fontSizes.body,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    deviceMeta: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radius.full,
    },
    badgeBlocked: {
      backgroundColor: colors.danger + '20',
    },
    badgeTextBlocked: {
      color: colors.danger,
    },
    badgeLocked: {
      backgroundColor: colors.warning + '20',
    },
    badgeTextLocked: {
      color: colors.warning,
    },
    badgeText: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.medium,
    },
    statusRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    statusItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    statusText: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
    },
    actions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    error: {
      color: colors.danger,
      fontSize: typography.fontSizes.caption,
      textAlign: 'center',
    },
  });
