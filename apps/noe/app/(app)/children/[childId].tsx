import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { MaterialIcons } from '@expo/vector-icons';

import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { SectionHeader } from '@/components/ui/section-header';
import { childService } from '@/features/children/services/child-service';
import { familyService } from '@/features/family/services/family-service';
import { deviceControlService } from '@/features/device-control/services/device-control-service';
import { useScreenPadding } from '@/hooks/use-screen-padding';
import { errorMessage, useAsyncData, colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';
import { requireSupabaseClient } from '@noe-arcakids/supabase';

const AVATARS = ['🐻', '🐰', '🐱', '🐶', '🦊', '🐼', '🦁', '🐸', '🐵', '🦋', '🌟', '🚀'];

interface ChildDetail {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export default function ChildDetailScreen() {
  const { t: tr } = useTranslation();
  const router = useRouter();
  const screenPadding = useScreenPadding();
  const { childId } = useLocalSearchParams<{ childId: string }>();

  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [commandFeedback, setCommandFeedback] = useState<string | null>(null);
  const [commandLoading, setCommandLoading] = useState<string | null>(null);
  const [deviceStatus, setDeviceStatus] = useState<{
    deviceUuid: string | null;
    lastSeen: string | null;
    battery: number | null;
    latitude: number | null;
    longitude: number | null;
    isLocked: boolean;
  } | null>(null);

  const fetchChild = async (): Promise<ChildDetail> => {
    const { family } = await familyService.getMyFamily();
    const children = await childService.listChildren(family.id);
    const child = children.find((c) => c.id === childId);
    if (!child) throw new Error(tr('noe.children.notFound'));
    return {
      id: child.id,
      displayName: child.displayName,
      avatarUrl: child.avatarUrl,
      createdAt: child.createdAt,
    };
  };

  const handleLoaded = (data: ChildDetail) => {
    if (!loaded) {
      setDisplayName(data.displayName);
      setSelectedAvatar(data.avatarUrl ?? AVATARS[0]);
      setLoaded(true);
    }
  };

  const { data: child, error, loading, reload } = useAsyncData(fetchChild, handleLoaded);

  const fetchDevice = useCallback(async (): Promise<void> => {
    if (!childId) return;
    try {
      const client = requireSupabaseClient();
      // Try devices table first (legacy), then device_status
      const { data: dev } = await client
        .from('devices')
        .select('device_uuid')
        .eq('child_id', childId)
        .order('last_seen_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const deviceUuid = (dev as { device_uuid?: string } | null)?.device_uuid ?? null;
      if (deviceUuid) {
        const status = await deviceControlService.getDeviceStatus(deviceUuid);
        setDeviceStatus({
          deviceUuid,
          lastSeen: status?.lastSeen ?? null,
          battery: status?.battery ?? null,
          latitude: status?.latitude ?? null,
          longitude: status?.longitude ?? null,
          isLocked: status?.isLocked ?? false,
        });
      } else {
        // fallback to device_status by child_id
        const { data: ds } = await client.from('device_status').select('*').eq('child_id', childId).limit(1).maybeSingle();
        const row = ds as Record<string, unknown> | null;
        if (row) {
          setDeviceStatus({
            deviceUuid: row.device_uuid as string,
            lastSeen: row.last_seen as string | null,
            battery: row.battery as number | null,
            latitude: row.latitude as number | null,
            longitude: row.longitude as number | null,
            isLocked: Boolean(row.is_locked),
          });
        } else {
          setDeviceStatus({ deviceUuid: null, lastSeen: null, battery: null, latitude: null, longitude: null, isLocked: false });
        }
      }
    } catch {
      setDeviceStatus({ deviceUuid: null, lastSeen: null, battery: null, latitude: null, longitude: null, isLocked: false });
    }
  }, [childId]);

  // fetch device status when child loads
  const { loading: deviceLoading, reload: reloadDevice } = useAsyncData(fetchDevice);

  async function handleSave() {
    if (!child) return;
    setSaving(true);
    setActionError(null);
    try {
      await childService.updateChild(child.id, displayName, selectedAvatar);
      router.back();
    } catch (cause) {
      setActionError(errorMessage(cause));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!child) return;
    Alert.alert(
      tr('noe.children.deleteTitle'),
      tr('noe.children.deleteConfirm', { name: child.displayName }),
      [
        { text: tr('common.cancel'), style: 'cancel' },
        {
          text: tr('noe.children.deleteButton'),
          style: 'destructive',
          onPress: async () => {
            try {
              await childService.removeChild(child.id);
              router.back();
            } catch (cause) {
              setActionError(errorMessage(cause));
            }
          },
        },
      ],
    );
  }

  async function runCommand(
    kind: 'lock' | 'unlock' | 'location' | 'status'
  ) {
    if (!deviceStatus?.deviceUuid) {
      setCommandFeedback(tr('noe.deviceControl.noDevice'));
      return;
    }
    setCommandLoading(kind);
    setCommandFeedback(null);
    try {
      if (kind === 'lock') {
        await deviceControlService.lockDevice(deviceStatus.deviceUuid);
      } else if (kind === 'unlock') {
        await deviceControlService.unlockDevice(deviceStatus.deviceUuid);
      } else if (kind === 'location') {
        await deviceControlService.requestLocation(deviceStatus.deviceUuid);
      } else if (kind === 'status') {
        await reloadDevice();
      }
      setCommandFeedback(tr('noe.deviceControl.commandSent'));
      if (kind === 'status') {
        // reload already done
      } else {
        // refresh status after short delay
        setTimeout(() => { void reloadDevice(); }, 1500);
      }
    } catch (cause) {
      setCommandFeedback(`${tr('noe.deviceControl.commandFailed')}: ${errorMessage(cause)}`);
    } finally {
      setCommandLoading(null);
    }
  }

  if (loading) {
    return (
      <View style={styles.screen}>
        <LoadingState text={tr('common.loading')} />
      </View>
    );
  }

  if (error || !child) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error ?? tr('common.unexpected')} onRetry={reload} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.screen, { paddingTop: screenPadding.paddingTop }]} keyboardShouldPersistTaps="handled">
      <Pressable style={styles.headerRow} onPress={() => router.replace('/(app)/children')}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        <Text style={styles.headerTitle}>{tr('noe.children.editTitle')}</Text>
      </Pressable>

      <SectionHeader title={tr('noe.children.editTitle')} />

      <Card style={styles.card}>
        <View style={styles.avatarSection}>
          <Avatar name={child.displayName} emoji={selectedAvatar} size={80} />
          <Text style={styles.avatarHint}>{tr('noe.children.pickAvatar')}</Text>
          <View style={styles.avatarGrid}>
            {AVATARS.map((emoji) => (
              <View key={emoji} style={[styles.avatarWrapper, emoji === selectedAvatar && styles.avatarSelected]}>
                <Avatar name={emoji} emoji={emoji} size={40} />
              </View>
            ))}
          </View>
        </View>

        <Input
          label={tr('noe.children.nameLabel')}
          value={displayName}
          onChangeText={setDisplayName}
          placeholder={tr('noe.children.namePlaceholder')}
        />

        <Text style={styles.memberSince}>
          {tr('noe.children.memberSince', {
            date: new Date(child.createdAt).toLocaleDateString(),
          })}
        </Text>

        {actionError ? <ErrorState message={actionError} /> : null}

        <Button onPress={handleSave} loading={saving} disabled={displayName.trim().length === 0}>
          {tr('noe.children.save')}
        </Button>
      </Card>

      {/* ── FASE 10: Remote control ── */}
      <Card style={styles.card}>
        <SectionHeader title={tr('noe.deviceControl.title')} />
        <Text style={styles.subtitle}>{tr('noe.deviceControl.subtitle')}</Text>

        {deviceLoading ? (
          <LoadingState text={tr('common.loading')} />
        ) : !deviceStatus?.deviceUuid ? (
          <Text style={styles.muted}>{tr('noe.deviceControl.noDevice')}</Text>
        ) : (
          <View style={styles.statusBox}>
            <Text style={styles.statusTitle}>{tr('noe.deviceControl.statusTitle')}</Text>
            <Text style={styles.muted}>
              {deviceStatus.lastSeen
                ? tr('noe.deviceControl.lastSeen', { time: new Date(deviceStatus.lastSeen).toLocaleString() })
                : tr('common.never')}
            </Text>
            {deviceStatus.battery !== null ? (
              <Text style={styles.muted}>{tr('noe.deviceControl.battery', { value: deviceStatus.battery })}</Text>
            ) : null}
            {deviceStatus.latitude !== null && deviceStatus.longitude !== null ? (
              <Text style={styles.muted}>
                {tr('noe.deviceControl.location', { lat: deviceStatus.latitude.toFixed(4), lon: deviceStatus.longitude.toFixed(4) })}
              </Text>
            ) : null}
            <Text style={[styles.badge, deviceStatus.isLocked ? styles.badgeLocked : styles.badgeUnlocked]}>
              {deviceStatus.isLocked ? tr('noe.deviceControl.isLocked') : tr('noe.deviceControl.isUnlocked')}
            </Text>
          </View>
        )}

        <View style={styles.controlGrid}>
          <Button
            onPress={() => runCommand('lock')}
            loading={commandLoading === 'lock'}
            disabled={!deviceStatus?.deviceUuid}
          >
            {tr('noe.deviceControl.lock')}
          </Button>
          <Button
            variant="secondary"
            onPress={() => runCommand('unlock')}
            loading={commandLoading === 'unlock'}
            disabled={!deviceStatus?.deviceUuid}
          >
            {tr('noe.deviceControl.unlock')}
          </Button>
          <Button
            variant="secondary"
            onPress={() => runCommand('location')}
            loading={commandLoading === 'location'}
            disabled={!deviceStatus?.deviceUuid}
          >
            {tr('noe.deviceControl.requestLocation')}
          </Button>
          <Button
            variant="ghost"
            onPress={() => runCommand('status')}
            loading={commandLoading === 'status'}
          >
            {tr('noe.deviceControl.viewStatus')}
          </Button>
        </View>

        {commandFeedback ? <Text style={styles.feedback}>{commandFeedback}</Text> : null}
      </Card>

      <Button variant="danger" onPress={handleDelete}>
        {tr('noe.children.deleteChild')}
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    backgroundColor: colors.background,
    gap: spacing.md,
    paddingTop: spacing.xxl,
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
  card: {
    ...shadows.sm,
  },
  avatarSection: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  avatarHint: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  avatarWrapper: {
    borderWidth: 2,
    borderColor: 'transparent',
    borderRadius: radius.full,
  },
  avatarSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  memberSince: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  subtitle: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    lineHeight: 18,
  },
  muted: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  statusBox: {
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusTitle: {
    fontSize: typography.fontSizes.body,
    fontWeight: typography.fontWeights.medium,
    color: colors.text,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.medium,
    overflow: 'hidden',
  },
  badgeLocked: {
    backgroundColor: colors.danger + '20',
    color: colors.danger,
  },
  badgeUnlocked: {
    backgroundColor: colors.success + '20',
    color: colors.success,
  },
  controlGrid: {
    gap: spacing.sm,
  },
  feedback: {
    fontSize: typography.fontSizes.caption,
    color: colors.primary,
    textAlign: 'center',
  },
});
