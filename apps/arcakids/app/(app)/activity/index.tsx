import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@noe-arcakids/shared';

export default function ActivityScreen() {
  const { t: tr } = useTranslation();
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{tr('arcakids.activity.title')}</Text>
      <Text style={styles.date}>{today}</Text>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyEmoji}>🌱</Text>
        <Text style={styles.emptyTitle}>{tr('arcakids.activity.nothingYet')}</Text>
        <Text style={styles.emptyText}>{tr('arcakids.activity.emptyText')}</Text>
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