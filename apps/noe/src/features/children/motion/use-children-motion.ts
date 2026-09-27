import { useCallback, useEffect } from 'react';
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { CHILDREN_MOTION } from './children-motion';

/**
 * Feedback de press de Fase 3: scale 0.98 + opacity 0.85 en 120 ms y retorno
 * en 180 ms. Mismo patron que `Button`, reutilizado por las tarjetas de lista.
 *
 * El `style` que devuelve se pasa directo a un componente `Animated`.
 */
export function usePressAnimation() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  /* eslint-disable react-hooks/immutability */
  const onPressIn = useCallback(() => {
    scale.value = withTiming(CHILDREN_MOTION.pressScale, { duration: CHILDREN_MOTION.pressIn });
    opacity.value = withTiming(CHILDREN_MOTION.pressOpacity, { duration: CHILDREN_MOTION.pressIn });
  }, [scale, opacity]);

  const onPressOut = useCallback(() => {
    scale.value = withTiming(1, { duration: CHILDREN_MOTION.pressOut });
    opacity.value = withTiming(1, { duration: CHILDREN_MOTION.pressOut });
  }, [scale, opacity]);
  /* eslint-enable react-hooks/immutability */

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return { style, onPressIn, onPressOut };
}

/**
 * Entrada de un item de lista: 16 px de desplazamiento y opacidad 0 -> 1 en
 * 220 ms, con stagger para que la lista respire en cascada. Se dispara sola al
 * montar, por lo que el item solo necesita envolver su contenido.
 */
export function useEnterAnimation(index = 0, enabled = true) {
  const progress = useSharedValue(enabled ? 0 : 1);

  useEffect(() => {
    if (!enabled) {
      progress.value = 1;
      return;
    }
    progress.value = withDelay(
      index * CHILDREN_MOTION.stagger,
      withTiming(1, { duration: CHILDREN_MOTION.transition, easing: Easing.out(Easing.cubic) }),
    );
  }, [enabled, index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      {
        translateY: (1 - progress.value) * CHILDREN_MOTION.transitionOffset,
      },
    ],
  }));

  return { style };
}
