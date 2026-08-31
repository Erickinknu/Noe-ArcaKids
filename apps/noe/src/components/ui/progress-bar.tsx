import { useMemo } from 'react';
import { View, Text, StyleSheet, type DimensionValue } from 'react-native';

import { useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

interface ProgressBarProps {
  value: number;
  max: number;
  height?: number;
  showLabel?: boolean;
  label?: string;
}

function getColor(ratio: number, colors: ThemeColors): string {
  if (ratio >= 1) return colors.danger;
  if (ratio >= 0.8) return colors.warning;
  return colors.primary;
}

export function ProgressBar({ value, max, height = 8, showLabel = false, label }: ProgressBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const ratio = max > 0 ? Math.min(value / max, 1.2) : 0;
  const fillWidth = `${Math.min(ratio * 100, 100)}%`;
  const color = getColor(ratio, colors);

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height }]}>
        <View style={[styles.fill, { width: fillWidth as DimensionValue, height, backgroundColor: color }]} />
      </View>
      {showLabel ? (
        <Text style={styles.label}>
          {label ?? `${value} / ${max}`}
        </Text>
      ) : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      gap: spacing.xs,
    },
    track: {
      width: '100%',
      borderRadius: radius.full,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    fill: {
      borderRadius: radius.full,
    },
    label: {
      fontSize: typography.fontSizes.caption,
      color: colors.textMuted,
    },
  });
