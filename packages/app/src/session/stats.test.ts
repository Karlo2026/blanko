import { describe, expect, it } from 'vitest';
import { addRound, addSession, EMPTY_STATS, loadStats, saveStats } from './stats.ts';

describe('Statistik', () => {
  it('zählt Sitzungen, Runden, Siege und Punkte je Stufe', () => {
    const stats = addRound(
      addRound(addSession(EMPTY_STATS), 'mittel', 2, true),
      'mittel',
      -1,
      false,
    );
    expect(stats).toEqual({
      sessions: 1,
      rounds: 2,
      wins: 1,
      placementPoints: 1,
      byLevel: { mittel: { rounds: 2, placementPoints: 1 } },
    });
  });

  it('speichert und lädt über den lokalen Speicher', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    const stats = addSession(EMPTY_STATS);
    saveStats(storage, stats);
    expect(loadStats(storage)).toEqual(stats);
  });

  it('übersteht kaputte oder gesperrte Speicher', () => {
    expect(loadStats({ getItem: () => '{kaputt' })).toEqual(EMPTY_STATS);
    expect(() => {
      saveStats(
        {
          setItem: () => {
            throw new Error('voll');
          },
        },
        EMPTY_STATS,
      );
    }).not.toThrow();
  });
});
