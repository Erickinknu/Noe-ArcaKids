import { StyleSheet, View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

interface AchievementBarProps {
  achievement: {
    name: string;
    targetType: string;
    targetValue: number;
    currentValue: number;
  };
  onCheckProgress?: (currentValue: number) => void;
}

export function AchievementBar({ achievement, onCheckProgress }: AchievementBarProps) {
  const { t: tr } = useTranslation();
  const percentage = Math.round((achievement.currentValue / achievement.targetValue) * 100);

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{tr(achievement.name)}</Text>
      <View style={styles.track}>
        <View style={styles.bar} />
      </View>
      <View style={styles.labels}>
        <Text style={styles.current}>{achievement.currentValue}{achievement.targetType.includes('minute') ? ' min' : ''}</Text>
        <Text style={styles.target}>{achievement.targetValue}{achievement.targetType.includes('minute') ? ' min' : ''}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  name: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  track: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  labels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  current: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  target: {
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    fontWeight: typography.fontWeights.semibold,
  },
});