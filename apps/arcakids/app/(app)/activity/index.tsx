import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '@noe-arcakids/shared';

export default function ActivityScreen() {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Activity</Text>
      <Text style={styles.date}>{today}</Text>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>🌱</Text>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptyText}>
          Your activity will show up here once you start exploring. Check back soon!
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    padding: spacing.lg,
    paddingTop: 80,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  date: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing.lg,
    paddingVertical: spacing.xxl,
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 16,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
  },
  emptyText: {
    fontSize: typography.fontSizes.body,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
});