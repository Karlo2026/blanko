import { describe, expect, it } from 'vitest';
import { simulate, tournament } from './commands.ts';
import { availableProfileIds, loadEntrant } from './profile-store.ts';
import { toCsv, toMarkdown } from './report.ts';

describe('Profile im Labor', () => {
  it('sind alle gültig', () => {
    for (const id of availableProfileIds()) {
      expect(loadEntrant(id).id).toBe(id);
    }
  });

  it('melden unbekannte Namen mit einer Liste der vorhandenen', () => {
    expect(() => loadEntrant('gibtsnicht')).toThrow(/Vorhanden: .*zufall/);
  });
});

describe('simulate', () => {
  it('fasst gleiche Profile zusammen und lässt RuleBots den Zufall schlagen', async () => {
    const seats = ['basis', 'zufall', 'basis', 'zufall'].map(loadEntrant);
    const result = await simulate(seats, { games: 400, seed: 1, workers: 1 });
    expect(result.summary.entrants.map((e) => e.id)).toEqual(['basis', 'zufall']);
    const [basis, zufall] = result.summary.entrants;
    expect(basis?.avgPlacementPoints).toBeGreaterThan(zufall?.avgPlacementPoints ?? 0);
  });

  it('lehnt eine ungültige Spielerzahl ab', async () => {
    await expect(
      simulate([loadEntrant('basis')], { games: 1, seed: 1, workers: 1 }),
    ).rejects.toThrow();
  });
});

describe('tournament', () => {
  const entrants = ['basis', 'anfaenger', 'zufall'].map(loadEntrant);

  it('liefert bei gleichem Seed dieselben Elo-Werte, egal mit wie vielen Workern', async () => {
    const options = { games: 1500, seed: 4 };
    const single = await tournament(entrants, 3, { ...options, workers: 1 });
    const parallel = await tournament(entrants, 3, { ...options, workers: 3 });
    expect(parallel).toEqual(single);
    expect(single.elo?.basis).toBeGreaterThan(single.elo?.zufall ?? Infinity);
  });

  it('braucht mindestens zwei Profile', async () => {
    await expect(
      tournament([loadEntrant('basis')], 4, { games: 1, seed: 1, workers: 1 }),
    ).rejects.toThrow();
  });

  it('erzeugt CSV und Markdown mit einer Zeile je Teilnehmer', async () => {
    const result = await tournament(entrants, 3, { games: 100, seed: 1, workers: 1 });
    expect(toCsv(result).trim().split('\n')).toHaveLength(4);
    expect(toMarkdown(result)).toContain('| basis |');
  });
});
