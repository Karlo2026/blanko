import { createRng } from '@blanko/engine';
import { describe, expect, it } from 'vitest';
import { mutateParams, randomParams } from './param-space.ts';

const inBounds = (params: ReturnType<typeof randomParams>): boolean =>
  params.keepMargin >= -2 &&
  params.keepMargin <= 5 &&
  params.knockThresholds.every((t) => t >= 0 && t <= 20) &&
  params.suspicionThreshold >= 0 &&
  params.suspicionThreshold <= 1.2;

describe('Parameterraum', () => {
  it('erzeugt zufällige Parameter innerhalb der Grenzen', () => {
    const rng = createRng(1);
    for (let i = 0; i < 200; i++) {
      const params = randomParams(rng, 5);
      expect(params.knockThresholds).toHaveLength(5);
      expect(inBounds(params)).toBe(true);
    }
  });

  it('verändert bei einer Mutation nur einen Teil der Parameter, in kleinen Schritten', () => {
    const rng = createRng(2);
    const start = randomParams(rng, 5);
    let unchanged = 0;
    for (let i = 0; i < 200; i++) {
      const mutated = mutateParams(start, rng);
      expect(inBounds(mutated)).toBe(true);
      expect(Math.abs(mutated.keepMargin - start.keepMargin)).toBeLessThan(3);
      if (mutated.keepMargin === start.keepMargin) unchanged++;
    }
    expect(unchanged).toBeGreaterThan(100);
    expect(unchanged).toBeLessThan(180);
  });
});
