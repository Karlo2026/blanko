import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRng, scoreRound } from '@blanko/engine';
import { describe, expect, it } from 'vitest';
import { parseAppProfiles } from './profiles.ts';
import { completeRound, createSession, startSessionRound, statsKey } from './session/session.ts';

const exported: unknown = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'public', 'profiles.json'), 'utf8'),
);
const profiles = parseAppProfiles(exported);

describe('profiles.json aus dem Labor', () => {
  it('enthält die vier Stufen mit aufsteigender Wertung', () => {
    expect(profiles.levels.map((l) => l.label)).toEqual(['Anfänger', 'Mittel', 'Stark', 'Meister']);
    const ratings = profiles.levels.map((l) => l.profile.rating ?? 0);
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b));
  });

  it('enthält eine nach Wertung sortierte Leiter', () => {
    expect(profiles.ladder.length).toBeGreaterThanOrEqual(4);
    const ratings = profiles.ladder.map((p) => p.rating ?? 0);
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b));
  });

  it('lehnt unvollständige Daten ab', () => {
    expect(() => parseAppProfiles({ levels: [] })).toThrow('fehlen');
  });
});

describe('Sitzung', () => {
  const [level] = profiles.levels;
  if (level === undefined) throw new Error('Stufe fehlt');

  it('summiert Platzierungspunkte, gibt den Geber weiter und setzt das nächste Profil', () => {
    const rng = createRng(1);
    const session = createSession({ kind: 'fixed', level }, level.profile, 2, rng);
    expect(session.names).toEqual(['Du', 'Karl', 'Greta']);
    const score = scoreRound(startSessionRound(session, rng), rng);
    const nextProfile = profiles.ladder.at(-1) ?? level.profile;
    const next = completeRound(session, score, nextProfile);
    expect(next.totals).toEqual(score.placementPoints);
    expect(next.round).toBe(2);
    expect(next.dealer).toBe((session.dealer + 1) % 3);
    expect(next.profile).toBe(nextProfile);
  });

  it('führt die Statistik je Stufe oder als „dynamisch“', () => {
    expect(statsKey({ kind: 'fixed', level })).toBe(level.level);
    expect(statsKey({ kind: 'dynamic' })).toBe('dynamisch');
  });
});
