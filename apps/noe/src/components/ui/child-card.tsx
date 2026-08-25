import { StyleSheet, Text, View, Alert, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Avatar } from '@/components/ui/avatar';
import { formatDuration, relativeTime } from '@/features/dashboard/services/dashboard-service';
import { colors, radius, shadows, spacing, typography } from '@noe-arcakids/shared';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusDot } from '@/components/ui/status-dot';
import type { ChildSummary } from '@/features/dashboard/types';
import { parentalService } from '@/features/parental/services/parental-service';
import { ROUTES } from '@/constants';

export default function ChildCard({
  child,
  familyId,
  onAction,
}: {
  child: ChildSummary;
  familyId: string | null;
  onAction: () => void;
}) {
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