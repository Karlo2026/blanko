import { describe, expect, it } from 'vitest';
import { measureChallenger } from './fitness.ts';
import { loadEntrant } from './profile-store.ts';
import { tune } from './tune.ts';

const basis = loadEntrant('basis');
if (basis.kind !== 'profile') throw new Error('basis muss ein Profil sein');

describe('measureChallenger', () => {
  it('misst gegen sich selbst etwa 0 und gegen den Zufall klar positiv', async () => {
    const self = await measureChallenger(basis, basis, 1000, 1, 1);
    expect(Math.abs(self.mean)).toBeLessThan(4 * self.standardError);
    const vsRandom = await measureChallenger(basis, loadEntrant('zufall'), 500, 1, 1);
    expect(vsRandom.mean).toBeGreaterThan(0.5);
  });
});

describe('tune', () => {
  const options = {
    method: 'evolve' as const,
    generations: 2,
    candidates: 2,
    games: 200,
    seed: 1,
    workers: 1,
  };

  it('liefert ein getuntes Profil mit Verlauf und ist reproduzierbar', async () => {
    const result = await tune(basis.profile, options);
    expect(result.history).toHaveLength(2);
    expect(result.tuned.id).toBe('basis-getunt');
    expect(result.tuned.rule.knockThresholds).toHaveLength(5);
    expect(await tune(basis.profile, options)).toEqual(result);
  });

  it('übernimmt einen Kandidaten nur bei signifikantem Vorsprung', async () => {
    const result = await tune(basis.profile, { ...options, method: 'random' });
    for (const generation of result.history) {
      expect(generation.accepted).toBe(
        generation.confirmation.mean > 2 * generation.confirmation.standardError,
      );
    }
  });

  it('macht aus einem schwachen Start durch Zufallssuche einen stärkeren', async () => {
    const weak = {
      ...basis.profile,
      rule: { ...basis.profile.rule, keepMargin: 5, knockThresholds: [20, 20, 20, 20, 20] },
    };
    const result = await tune(weak, {
      ...options,
      method: 'random',
      generations: 3,
      candidates: 4,
      games: 400,
    });
    expect(result.history.some((g) => g.accepted)).toBe(true);
  });
});
