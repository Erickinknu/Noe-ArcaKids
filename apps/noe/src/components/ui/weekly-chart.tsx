import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors, radius, spacing, typography } from '@noe-arcakids/shared';

const CHART_HEIGHT = 120;
const BAR_WIDTH = 28;

function getBarColor(minutes: number): string {
  if (minutes < 60) return colors.success;
  if (minutes <= 120) return colors.warning;
  return colors.danger;
}

function formatDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

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

const styles = StyleSheet.create({
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