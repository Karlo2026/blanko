import { createRng } from '@blanko/engine';
import { describe, expect, it } from 'vitest';
import { estimateHand, soleLowestProbability } from './estimate.ts';
import { hidden, known, makeView } from './test-support.ts';

describe('estimateHand', () => {
  it('zählt bekannte Ränge einmal und unbekannte Karten mit dem Erwartungswert', () => {
    expect(estimateHand([known(13), known(13, 'hearts'), hidden, { kind: 'empty' }], 6)).toBe(16);
  });
});

describe('soleLowestProbability', () => {
  const rng = createRng(1);

  it('ist 1, wenn alle Hände bekannt sind und die eigene allein am niedrigsten ist', () => {
    const view = makeView({
      hands: [
        [known(1), known(2)],
        [known(5), known(6)],
      ],
    });
    expect(soleLowestProbability(view, 20, 0, rng)).toBe(1);
  });

  it('ist 0 bei Gleichstand, weil der Klopfer dann Letzter wird', () => {
    const view = makeView({ hands: [[known(3)], [known(3, 'hearts')]] });
    expect(soleLowestProbability(view, 20, 0, rng)).toBe(0);
  });

  it('wird kleiner, je niedriger die verdeckten Gegnerkarten angenommen werden', () => {
    const view = makeView({
      hands: [
        [known(2), known(3), known(4)],
        [hidden, hidden, hidden, hidden],
      ],
    });
    const neutral = soleLowestProbability(view, 400, 0, createRng(2));
    const biased = soleLowestProbability(view, 400, 0.5, createRng(2));
    expect(biased).toBeLessThan(neutral - 0.1);
  });
});
