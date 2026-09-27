import { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, type DimensionValue } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useTheme, radius, spacing, typography, type ThemeColors } from '@noe-arcakids/shared';

import { CHILDREN_MOTION, progressWidth } from '../../features/children/motion/children-motion';

interface ProgressBarProps {
  value: number;
  max: number;
  height?: number;
  showLabel?: boolean;
  label?: string;
  /**
   * Anima el relleno con la curva de Fase 3 (600ms, salida cubica). Es opt-in:
   * las pantallas que no lo activen conservan el relleno estatico de siempre.
   */
  animated?: boolean;
}

function getColor(ratio: number, colors: ThemeColors): string {
  if (ratio >= 1) return colors.danger;
  if (ratio >= 0.8) return colors.warning;
  return colors.primary;
}

export function ProgressBar({
  value,
  max,
  height = 8,
  showLabel = false,
  label,
  animated = false,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const ratio = max > 0 ? Math.min(value / max, 1.2) : 0;
  const targetWidth = progressWidth(ratio);
  const color = getColor(ratio, colors);

  const width = useSharedValue(targetWidth);

  useEffect(() => {
    if (!animated) {
      width.value = targetWidth;
      return;
    }
    width.value = withTiming(targetWidth, {
      duration: CHILDREN_MOTION.progress,
      easing: Easing.out(Easing.cubic),
    });
    return () => cancelAnimation(width);
  }, [animated, targetWidth, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%` as DimensionValue,
  }));

  const fillBase = [styles.fill, { height, backgroundColor: color }];
  // Una sola rama: la estatica conserva el ancho por porcentaje de antes, la
  // animada lo delega al worklet.
  const fill = animated ? (
    <Animated.View style={[...fillBase, animatedStyle]} />
  ) : (
    <View style={[...fillBase, { width: `${targetWidth}%` as DimensionValue }]} />
  );

  return (
    <View style={styles.container}>
      <View style={[styles.track, { height }]}>{fill}</View>
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
