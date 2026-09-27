import { CHILDREN_MOTION, progressWidth, skeletonPulse } from './children-motion';

describe('CHILDREN_MOTION', () => {
  it('replica el feedback de press ya usado en Button', () => {
    expect(CHILDREN_MOTION.pressScale).toBe(0.98);
    expect(CHILDREN_MOTION.pressOpacity).toBe(0.85);
    expect(CHILDREN_MOTION.pressIn).toBe(120);
    expect(CHILDREN_MOTION.pressOut).toBe(180);
  });

  it('usa una transicion corta de 16px y la barra de 600ms', () => {
    expect(CHILDREN_MOTION.transitionOffset).toBe(16);
    expect(CHILDREN_MOTION.transition).toBe(220);
    expect(CHILDREN_MOTION.progress).toBe(600);
  });
});

describe('skeletonPulse', () => {
  it('arranca en el minimo y alcanza el maximo a mitad de ciclo', () => {
    expect(skeletonPulse(0)).toBeCloseTo(CHILDREN_MOTION.skeletonMin, 5);
    expect(skeletonPulse(0.5)).toBeCloseTo(CHILDREN_MOTION.skeletonMax, 5);
  });

  it('vuelve al minimo al cerrar el ciclo', () => {
    expect(skeletonPulse(1)).toBeCloseTo(CHILDREN_MOTION.skeletonMin, 5);
  });

  it('nunca sale del rango configurado', () => {
    for (let i = 0; i <= 20; i += 1) {
      const value = skeletonPulse(i / 20);
      expect(value).toBeGreaterThanOrEqual(CHILDREN_MOTION.skeletonMin);
      expect(value).toBeLessThanOrEqual(CHILDREN_MOTION.skeletonMax);
    }
  });
});

describe('progressWidth', () => {
  it('escala el ratio a porcentaje', () => {
    expect(progressWidth(0.5)).toBeCloseTo(50, 5);
    expect(progressWidth(0.25)).toBeCloseTo(25, 5);
  });

  it('acota a 100 cuando se pasa el maximo', () => {
    expect(progressWidth(1.4)).toBe(100);
  });

  it('devuelve 0 para ratios no positivos o no finitos', () => {
    expect(progressWidth(0)).toBe(0);
    expect(progressWidth(-0.2)).toBe(0);
    expect(progressWidth(Number.NaN)).toBe(0);
  });
});
