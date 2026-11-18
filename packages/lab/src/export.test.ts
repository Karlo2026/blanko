import { describe, expect, it } from 'vitest';
import type { Entrant } from './entrant.ts';
import { buildAppProfiles } from './export.ts';
import { ladderProfiles } from './ladder.ts';
import { loadEntrant } from './profile-store.ts';

const base = loadEntrant('basis-getunt');
if (base.kind !== 'profile') throw new Error('basis-getunt muss ein Profil sein');
const ladder: Entrant[] = ladderProfiles(base.profile, 4).map((profile) => ({
  kind: 'profile',
  id: profile.id,
  profile,
}));
const options = { games: 600, seed: 1, workers: 1 };

describe('buildAppProfiles', () => {
  it('ordnet die vier Stufen zu und sortiert die Leiter nach Wertung', async () => {
    const { profiles } = await buildAppProfiles(
      ladder,
      ['leiter-01', 'leiter-02', 'leiter-03', 'leiter-04'],
      4,
      options,
    );
    expect(profiles.levels.map((l) => [l.label, l.profile.id])).toEqual([
      ['Anfänger', 'leiter-01'],
      ['Mittel', 'leiter-02'],
      ['Stark', 'leiter-03'],
      ['Meister', 'leiter-04'],
    ]);
    const ratings = profiles.ladder.map((p) => p.rating ?? 0);
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b));
    expect(profiles.levels[3]?.profile.rating).toBeGreaterThan(
      profiles.levels[0]?.profile.rating ?? Infinity,
    );
  });

  it('verlangt genau vier Stufen aus der Leiter', async () => {
    await expect(buildAppProfiles(ladder, ['leiter-01'], 4, options)).rejects.toThrow('genau 4');
    await expect(
      buildAppProfiles(ladder, ['leiter-01', 'leiter-02', 'leiter-03', 'gibtsnicht'], 4, options),
    ).rejects.toThrow('gibtsnicht');
  });
});
