import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useParentalStatus } from '@/hooks/use-parental-status';
import { identityService } from '@/features/identity/services/identity-service';
import { Card, useAsyncData, useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

const APP_COLORS = [
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#14B8A6',
  '#F97316',
  '#6366F1',
];

function appColor(packageName: string): string {
  let hash = 0;
  for (let i = 0; i < packageName.length; i += 1) {
    hash = (hash * 31 + packageName.charCodeAt(i)) % 997;
  }
  return APP_COLORS[hash % APP_COLORS.length];
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface AppUsageItem {
  packageName: string;
  minutes: number;
}

export default function ActivityScreen() {
  const { t: tr } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const { data: childInfo } = useAsyncData(() => identityService.getChildInfo());
  const isLinked = Boolean(childInfo?.childId && childInfo?.familyId);
  const { rules, snapshot } = useParentalStatus(isLinked);

  const sortedApps = useMemo<AppUsageItem[]>(() => {
    if (!snapshot?.perApp) return [];
    return Object.entries(snapshot.perApp)
      .map(([pkg, mins]) => ({ packageName: pkg, minutes: mins }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [snapshot]);

  const totalMinutes = snapshot?.totalMinutes ?? 0;
  const limit = rules?.dailyLimitMinutes;
  const limitPercent =
    limit != null && limit > 0 ? Math.min((totalMinutes / limit) * 100, 100) : null;
  const isOverLimit = limit != null && totalMinutes >= limit;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>{tr('arcakids.activity.title')}</Text>
      <Text style={styles.date}>{today}</Text>

      <Card>
        <Text style={styles.cardTitle}>{tr('arcakids.activity.todaySummary')}</Text>
        <View style={styles.summaryRow}>
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryValue}>{formatMinutes(totalMinutes)}</Text>
            <Text style={styles.summaryLabel}>{tr('arcakids.activity.totalUsed')}</Text>
          </View>
          {limit != null ? (
            <View style={styles.summaryBlock}>
              <Text
                style={[
                  styles.summaryValue,
                  isOverLimit ? styles.dangerText : styles.successText,
                ]}
              >
                {formatMinutes(limit)}
              </Text>
              <Text style={styles.summaryLabel}>{tr('arcakids.activity.dailyLimit')}</Text>
            </View>
          ) : null}
          <View style={styles.summaryBlock}>
            <Text style={styles.summaryValue}>{sortedApps.length}</Text>
            <Text style={styles.summaryLabel}>{tr('arcakids.activity.appsUsed')}</Text>
          </View>
        </View>

        {limitPercent != null ? (
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${limitPercent}%`,
                    backgroundColor: isOverLimit ? colors.danger : colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, isOverLimit && styles.dangerText]}>
              {tr('arcakids.activity.limitProgress', {
                percent: Math.round(limitPercent),
              })}
            </Text>
          </View>
        ) : null}
      </Card>

      {rules?.bedtimeEnabled ? (
        <Card>
          <Text style={styles.cardTitle}>{tr('arcakids.activity.bedtimeStatus')}</Text>
          <Text style={styles.cardDescription}>
            {tr('arcakids.activity.bedtimeRange', {
              start: rules.bedtimeStart ?? '--:--',
              end: rules.bedtimeEnd ?? '--:--',
            })}
          </Text>
        </Card>
      ) : null}

      {sortedApps.length > 0 ? (
        <Card>
          <Text style={styles.cardTitle}>{tr('arcakids.activity.usageByApp')}</Text>
          <View style={styles.appList}>
            {sortedApps.map((item) => {
              const appPercent =
                totalMinutes > 0 ? (item.minutes / totalMinutes) * 100 : 0;
              return (
                <View key={item.packageName} style={styles.appRow}>
                  <View style={[styles.appDot, { backgroundColor: appColor(item.packageName) }]} />
                  <View style={styles.appInfo}>
                    <Text numberOfLines={1} style={styles.appPackage}>
                      {item.packageName.split('.').pop()}
                    </Text>
                    <View style={styles.appBarTrack}>
                      <View
                        style={[
                          styles.appBarFill,
                          {
                            width: `${appPercent}%`,
                            backgroundColor: appColor(item.packageName),
                          },
                        ]}
                      />
                    </View>
                  </View>
                  <Text style={styles.appMinutes}>{formatMinutes(item.minutes)}</Text>
                </View>
              );
            })}
          </View>
        </Card>
      ) : (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🌱</Text>
          <Text style={styles.emptyTitle}>{tr('arcakids.activity.nothingYet')}</Text>
          <Text style={styles.emptyText}>{tr('arcakids.activity.emptyText')}</Text>
        </Card>
      )}
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
  content: {
    padding: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: typography.fontSizes.heading,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  date: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  cardTitle: {
    fontSize: typography.fontSizes.subtitle,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  cardDescription: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  summaryBlock: {
    alignItems: 'center',
    gap: 2,
  },
  summaryValue: {
    fontSize: typography.fontSizes.title,
    fontWeight: typography.fontWeights.bold,
    color: colors.text,
  },
  summaryLabel: {
    fontSize: typography.fontSizes.caption,
    color: colors.textMuted,
  },
  dangerText: {
    color: colors.danger,
  },
  successText: {
    color: colors.success,
  },
  progressContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
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
  appList: {
    gap: spacing.sm,
  },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  appDot: {
    width: 10,
    height: 10,
    borderRadius: radius.full,
  },
  appInfo: {
    flex: 1,
    gap: 3,
  },
  appPackage: {
    fontSize: typography.fontSizes.caption,
    color: colors.text,
    textTransform: 'capitalize',
  },
  appBarTrack: {
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  appBarFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  appMinutes: {
    fontSize: typography.fontSizes.caption,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textMuted,
    minWidth: 40,
    textAlign: 'right',
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    gap: spacing.md,
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
