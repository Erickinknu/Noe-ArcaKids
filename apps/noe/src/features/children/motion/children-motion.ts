/**
 * Layout y paleta de las animaciones de la pantalla de Hijos (Fase 3).
 *
 * Se centraliza aqui para que el skeleton, el feedback de press, la transicion
 * de lista y la barra de progreso compartan exactamente los mismos numeros.
 * Los valores coinciden con los ya usados en `Button` (scale 0.98 / opacity
 * 0.85 en 120 ms con retorno de 180 ms).
 */
export const CHILDREN_MOTION = {
  /** Duraciones en ms. */
  pressIn: 120,
  pressOut: 180,
  transition: 220,
  progress: 600,
  /** Escala y opacidad al presionar. */
  pressScale: 0.98,
  pressOpacity: 0.85,
  /** Desplazamiento vertical de la entrada de cada item (px). */
  transitionOffset: 16,
  /** Stagger entre items de la lista (ms). */
  stagger: 40,
  /** Rango de pulsacion del skeleton (0.55 - 1). */
  skeletonMin: 0.55,
  skeletonMax: 1,
  skeletonDuration: 900,
} as const;

/** Opacidad pulsante del skeleton: triangular entre skeletonMin y skeletonMax. */
export function skeletonPulse(progress: number): number {
  'worklet';
  const { skeletonMin, skeletonMax } = CHILDREN_MOTION;
  const phase = progress * 2;
  const tri = phase <= 1 ? phase : 2 - phase;
  return skeletonMin + (skeletonMax - skeletonMin) * tri;
}

/** Ancho de la barra en funcion del ratio (0-1), acotado a 100%. */
export function progressWidth(ratio: number): number {
  if (!Number.isFinite(ratio) || ratio <= 0) return 0;
  return Math.min(ratio, 1) * 100;
}
