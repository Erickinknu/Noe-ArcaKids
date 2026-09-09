import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAchievements } from '@/features/achievements/use-achievements';
import { Card, useTheme, useVerseOfDay, VerseBanner, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

export default function AchievementsScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const router = useRouter();
  const { achievements, loading, error } = useAchievements();
  const wisdomVerse = useVerseOfDay(['wisdom'] as const);

  if (loading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <Text style={styles.message}>{tr('arcakids.achievements.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (error || achievements.length === 0) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.backButton}
            accessibilityRole="button"
            accessibilityLabel={tr('arcakids.onboarding.back')}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <Text style={styles.title}>{tr('arcakids.achievements.title')}</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>🏅</Text>
          <Text style={styles.message}>{tr('arcakids.achievements.empty')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel={tr('arcakids.onboarding.back')}
        >
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>{tr('arcakids.achievements.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {achievements.map((a) => (
          <Card key={a.achievementId} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.icon}>{a.icon}</Text>
              <View style={styles.cardHeaderText}>
                <Text style={styles.cardTitle}>{a.title}</Text>
                <Text style={styles.cardDesc}>{a.description}</Text>
              </View>
              {a.isAchieved ? (
                <Text style={[styles.check, { color: colors.success }]}>✓</Text>
              ) : null}
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${a.percentage}%`,
                    backgroundColor: a.isAchieved ? colors.success : colors.primary,
                  },
                ]}
              />
            </View>
            <Text
              style={[
                styles.progressText,
                a.isAchieved && { color: colors.success },
              ]}
            >
              {a.isAchieved
                ? tr('arcakids.achievements.achieved')
                : tr('arcakids.achievements.progress', { percent: a.percentage })}
            </Text>
          </Card>
        ))}
        {wisdomVerse ? (
          <View style={styles.verse}>
            <Text style={styles.verseLabel}>{tr('common.verseOfDay')}</Text>
            <VerseBanner verse={wisdomVerse} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.md,
    },
    backButton: {
      width: 36,
      height: 36,
      borderRadius: radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    backText: {
      fontSize: 20,
      color: colors.primary,
    },
    title: {
      fontSize: typography.fontSizes.heading,
      fontWeight: typography.fontWeights.bold,
      color: colors.text,
    },
    content: {
      padding: spacing.lg,
      gap: spacing.md,
      paddingBottom: spacing.xxl,
    },
    card: {
      gap: spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    cardHeaderText: {
      flex: 1,
      gap: 2,
    },
    cardTitle: {
      fontSize: typography.fontSizes.title,
      fontWeight: typography.fontWeights.semibold,
      color: colors.text,
    },
    cardDesc: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
    },
    icon: {
      fontSize: 32,
    },
    check: {
      fontSize: 20,
      fontWeight: typography.fontWeights.bold,
    },
    progressTrack: {
      height: 8,
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: radius.full,
    },
    progressText: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
      textAlign: 'right',
    },
    verse: {
      gap: spacing.xs,
    },
    verseLabel: {
      fontSize: typography.fontSizes.caption,
      fontWeight: typography.fontWeights.semibold,
      color: colors.textMuted,
      textTransform: 'uppercase',
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.md,
      padding: spacing.xxl,
    },
    emptyEmoji: {
      fontSize: 48,
    },
    message: {
      fontSize: typography.fontSizes.body,
      color: colors.textMuted,
      textAlign: 'center',
    },
  });