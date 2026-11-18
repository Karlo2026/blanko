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
// Als Zusatzstufe genügt für den Test ein schneller RuleBot; in der App ist es der Großmeister.
const extra = loadEntrant('basis');
const levelIds = ['leiter-01', 'leiter-02', 'leiter-03', 'leiter-04', 'basis'];
const options = { games: 600, seed: 1, workers: 1 };

describe('buildAppProfiles', () => {
  it('ordnet die fünf Stufen zu, die Zusatzstufe gehört nicht zur Leiter', async () => {
    const { profiles } = await buildAppProfiles(ladder, [extra], levelIds, 4, options);
    expect(profiles.levels.map((l) => [l.label, l.profile.id])).toEqual([
      ['Anfänger', 'leiter-01'],
      ['Mittel', 'leiter-02'],
      ['Stark', 'leiter-03'],
      ['Meister', 'leiter-04'],
      ['Großmeister', 'basis'],
    ]);
    expect(profiles.ladder.map((p) => p.id)).not.toContain('basis');
    expect(profiles.levels[4]?.profile.rating).not.toBeNull();
    const ratings = profiles.ladder.map((p) => p.rating ?? 0);
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b));
  });

  it('verlangt genau fünf vermessene Stufen', async () => {
    await expect(buildAppProfiles(ladder, [], ['leiter-01'], 4, options)).rejects.toThrow(
      'genau 5',
    );
    await expect(
      buildAppProfiles(
        ladder,
        [],
        ['leiter-01', 'leiter-02', 'leiter-03', 'leiter-04', 'gibtsnicht'],
        4,
        options,
      ),
    ).rejects.toThrow('gibtsnicht');
  });
});
