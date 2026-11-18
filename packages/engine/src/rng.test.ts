import { describe, expect, it } from 'vitest';
import { createRng } from './rng.ts';

const draw = (seed: number, count: number): number[] => {
  const rng = createRng(seed);
  return Array.from({ length: count }, () => rng.next());
};

describe('createRng', () => {
  it('liefert bei gleichem Seed dieselbe Folge', () => {
    expect(draw(42, 100)).toEqual(draw(42, 100));
  });

  it('liefert bei verschiedenen Seeds verschiedene Folgen', () => {
    expect(draw(1, 10)).not.toEqual(draw(2, 10));
  });

  it('bleibt mit next() im Intervall [0, 1)', () => {
    for (const value of draw(7, 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('verteilt nextInt() annähernd gleichmäßig', () => {
    const rng = createRng(123);
    const counts = new Array<number>(6).fill(0);
    const samples = 60_000;
    for (let i = 0; i < samples; i++) {
      const index = rng.nextInt(6);
      counts[index] = (counts[index] ?? 0) + 1;
    }
    for (const count of counts) {
      expect(count).toBeGreaterThan(samples / 6 - 500);
      expect(count).toBeLessThan(samples / 6 + 500);
    }
  });

  it('lehnt ungültige Obergrenzen ab', () => {
    const rng = createRng(1);
    expect(() => rng.nextInt(0)).toThrow(RangeError);
    expect(() => rng.nextInt(2.5)).toThrow(RangeError);
  });
});
