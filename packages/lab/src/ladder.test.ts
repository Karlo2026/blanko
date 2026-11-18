import { describe, expect, it } from 'vitest';
import { ladderProfiles } from './ladder.ts';
import { loadEntrant } from './profile-store.ts';

const base = loadEntrant('basis-getunt');
if (base.kind !== 'profile') throw new Error('basis-getunt muss ein Profil sein');

describe('ladderProfiles', () => {
  const ladder = ladderProfiles(base.profile, 5);

  it('nummeriert die Sprossen von der schwächsten an', () => {
    expect(ladder.map((p) => p.id)).toEqual([
      'leiter-01',
      'leiter-02',
      'leiter-03',
      'leiter-04',
      'leiter-05',
    ]);
  });

  it('macht weniger Fehler und vergisst weniger, je höher die Sprosse', () => {
    for (let i = 1; i < ladder.length; i++) {
      expect(ladder[i]?.mistakeRate).toBeLessThan(ladder[i - 1]?.mistakeRate ?? 0);
      expect(ladder[i]?.forgetRate).toBeLessThanOrEqual(ladder[i - 1]?.forgetRate ?? 0);
    }
  });

  it('entspricht auf der obersten Sprosse dem Ausgangsprofil', () => {
    expect(ladder.at(-1)).toEqual({
      ...base.profile,
      id: 'leiter-05',
      name: 'Leiter 05',
      rating: null,
    });
  });
});
