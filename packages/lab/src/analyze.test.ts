import { describe, expect, it } from 'vitest';
import { analyze } from './analyze.ts';
import { analysisFiles } from './analyze-report.ts';
import { loadEntrant } from './profile-store.ts';
import { addTo, meanOf, standardErrorOf, type Tally } from './tally.ts';

describe('Tally', () => {
  it('berechnet Mittelwert und Standardfehler', () => {
    const tallies = new Map<string, Tally>();
    for (const value of [1, 2, 3, 4]) addTo(tallies, 'x', value);
    const tally = tallies.get('x');
    if (tally === undefined) throw new Error('fehlt');
    expect(meanOf(tally)).toBe(2.5);
    expect(standardErrorOf(tally)).toBeCloseTo(Math.sqrt(5 / 3 / 4), 10);
  });
});

describe('analyze', () => {
  const base = loadEntrant('basis-getunt');
  if (base.kind !== 'profile') throw new Error('basis-getunt muss ein Profil sein');
  const analysis = analyze(base.profile, 200, 1);

  it('sammelt Daten zu allen vier Fragen', () => {
    expect(analysis.knock.size).toBeGreaterThan(0);
    expect(analysis.swap.size).toBeGreaterThan(0);
    expect(analysis.suspicion.size).toBeGreaterThan(0);
    expect(analysis.pairs.get('gesparte Punkte je Hand')?.n).toBe(analysis.rounds * 4);
  });

  it('ist bei gleichem Seed reproduzierbar', () => {
    expect(analyze(base.profile, 30, 5)).toEqual(analyze(base.profile, 30, 5));
  });

  it('schreibt einen Bericht mit allen vier Abschnitten', () => {
    const report = analysisFiles(analysis, 'basis-getunt', 1)['report.md'] ?? '';
    for (const heading of ['Klopfen', '10-Tausch', 'Verdacht', 'Paare']) {
      expect(report).toContain(heading);
    }
  });
});
