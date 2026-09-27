import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { radius, useTheme } from '@noe-arcakids/shared';

import { CHILDREN_MOTION, skeletonPulse } from '../../features/children/motion/children-motion';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

/**
 * Bloque de carga con pulso calido. Sustituye al spinner en las listas de la
 * app (ver `SkeletonList`) y comparte la paleta de pulsacion de Fase 3.
 */
export function Skeleton({ width = '100%', height = 14, radius: r = radius.sm, style }: SkeletonProps) {
  const { colors } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: CHILDREN_MOTION.skeletonDuration,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: skeletonPulse(progress.value),
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        { width, height, borderRadius: r, backgroundColor: colors.surfaceHover },
        animatedStyle,
        style,
      ]}
    />
  );
}

interface SkeletonListProps {
  /** Numero de filas placeholder. */
  count?: number;
  /** Alto de cada fila. */
  rowHeight?: number;
}

/**
 * Filas placeholder con el mismo ritmo de la lista real, para que el layout no
 * salte al terminar la carga.
 */
export function SkeletonList({ count = 3, rowHeight = 96 }: SkeletonListProps) {
  return (
    <View accessibilityLabel="Cargando" style={styles.list}>
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={[styles.row, { height: rowHeight }]}>
          <Skeleton width={rowHeight} height={rowHeight} radius={rowHeight / 2} />
          <View style={styles.rowBody}>
            <Skeleton width="55%" height={14} />
            <Skeleton width="80%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  rowBody: {
    flex: 1,
    gap: 8,
  },
});
