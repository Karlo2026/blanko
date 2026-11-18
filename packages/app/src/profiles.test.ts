import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRng, scoreRound } from '@blanko/engine';
import { describe, expect, it } from 'vitest';
import { parseLevels } from './profiles.ts';
import { completeRound, createSession, startSessionRound } from './session/session.ts';

const exported: unknown = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'public', 'profiles.json'), 'utf8'),
);

describe('profiles.json aus dem Labor', () => {
  it('enthält die vier Stufen mit gültigen, aufsteigend bewerteten Profilen', () => {
    const levels = parseLevels(exported);
    expect(levels.map((l) => l.label)).toEqual(['Anfänger', 'Mittel', 'Stark', 'Meister']);
    const ratings = levels.map((l) => l.profile.rating ?? 0);
    expect(ratings).toEqual([...ratings].sort((a, b) => a - b));
  });

  it('lehnt unvollständige Daten ab', () => {
    expect(() => parseLevels({})).toThrow('Stufen fehlen');
  });
});

describe('Sitzung', () => {
  it('summiert Platzierungspunkte und gibt den Geber im Uhrzeigersinn weiter', () => {
    const rng = createRng(1);
    const [level] = parseLevels(exported);
    if (level === undefined) throw new Error('Stufe fehlt');
    const session = createSession(level, 2, rng);
    expect(session.names).toEqual(['Du', 'Karl', 'Greta']);
    const score = scoreRound(startSessionRound(session, rng), rng);
    const next = completeRound(session, score);
    expect(next.totals).toEqual(score.placementPoints);
    expect(next.round).toBe(2);
    expect(next.dealer).toBe((session.dealer + 1) % 3);
  });
});
