import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMemo } from 'react';

import { Card, useTheme, radius, spacing, typography, type ThemeColors, type ThemeShadows } from '@noe-arcakids/shared';
import { Avatar } from '@/components/ui/avatar';
import { SectionHeader } from '@/components/ui/section-header';
import { formatDuration } from '@/features/dashboard/services/dashboard-service';
import type { DailyUsage } from '@/features/activity/services/activity-service';

const CHART_HEIGHT = 120;
const BAR_WIDTH = 28;

interface DailyBar {
  date: string;
  label: string;
  minutes: number;
  color: string;
}

interface ChildUsageSummary {
  childId: string;
  childName: string;
  totalMinutes: number;
  dailyData: DailyUsage[];
}

interface WeeklyChartProps {
  childSummaries: ChildUsageSummary[];
  weeklyBars: DailyBar[];
  maxMinutes: number;
}

export function WeeklyChart({ childSummaries, weeklyBars, maxMinutes }: WeeklyChartProps) {
  const { t: tr } = useTranslation();
  const { colors, shadows } = useTheme();
  const styles = useMemo(() => makeStyles(colors, shadows), [colors, shadows]);

  return (
    <Card style={styles.card}>
      <SectionHeader title={tr('noe.activity.usagePerChild')} />

      {childSummaries.map((child) => (
        <Card key={child.childId} style={styles.card}>
          <View style={styles.childRow}>
            <Avatar name={child.childName} size={40} />
            <View style={styles.childInfo}>
              <Text style={styles.childName}>{child.childName}</Text>
              <Text style={styles.childTotal}>{formatDuration(child.totalMinutes)}</Text>
            </View>
          </View>
        </Card>
      ))}

      <SectionHeader title={tr('noe.activity.last7Days')} />

      <Card style={styles.card}>
        <View style={styles.chartContainer}>
          {weeklyBars.map((bar) => (
            <View key={bar.date} style={styles.barColumn}>
              <Text style={styles.barValue}>{bar.minutes > 0 ? formatDuration(bar.minutes) : ''}</Text>
              <View style={[styles.bar, { height: Math.max((bar.minutes / maxMinutes) * CHART_HEIGHT, 4), backgroundColor: bar.color }]} />
              <Text style={styles.barLabel}>{bar.label}</Text>
            </View>
          ))}
        </View>
      </Card>
    </Card>
  );
}

const makeStyles = (colors: ThemeColors, shadows: ThemeShadows) =>
  StyleSheet.create({
  card: { ...shadows.sm },
  childRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  childInfo: { flex: 1 },
  childName: { fontSize: typography.fontSizes.subtitle, fontWeight: typography.fontWeights.semibold, color: colors.text },
  childTotal: { fontSize: typography.fontSizes.body, color: colors.textMuted, marginTop: 2 },
  chartContainer: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: CHART_HEIGHT + spacing.xl, paddingTop: spacing.xs },
  barColumn: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 10, color: colors.textMuted, marginBottom: 4 },
  bar: { width: BAR_WIDTH, borderRadius: radius.sm, minHeight: 4 },
  barLabel: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
});