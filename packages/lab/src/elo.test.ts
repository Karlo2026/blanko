import { describe, expect, it } from 'vitest';
import type { RoundRecord } from './chunk.ts';
import { fitElo, pairwiseWins } from './elo.ts';

/** Runde mit zwei Plätzen, in der `winner` (Teilnehmer-Index) vorne liegt. */
const duel = (winner: number, loser: number): RoundRecord => ({
  seats: [winner, loser],
  placementPoints: [2, -2],
  handPoints: [1, 2],
  ranking: [0, 1],
  knocker: null,
  turns: 1,
});

describe('pairwiseWins', () => {
  it('zählt jeden Platz als Sieg über alle schlechter platzierten', () => {
    const record: RoundRecord = {
      seats: [2, 0, 1],
      placementPoints: [0, 2, -2],
      handPoints: [5, 1, 9],
      ranking: [1, 0, 2],
      knocker: null,
      turns: 3,
    };
    expect(pairwiseWins([record], 3)).toEqual([
      [0, 1, 1],
      [0, 0, 0],
      [0, 1, 0],
    ]);
  });

  it('ignoriert Vergleiche eines Profils mit sich selbst', () => {
    expect(pairwiseWins([duel(0, 0)], 1)).toEqual([[0]]);
  });
});

describe('fitElo', () => {
  it('gibt gleich starken Teilnehmern 1500', () => {
    const ratings = fitElo([
      [0, 50],
      [50, 0],
    ]);
    expect(ratings[0]).toBeCloseTo(1500, 6);
    expect(ratings[1]).toBeCloseTo(1500, 6);
  });

  it('entspricht bei 10:1 im Zweikampf etwa 400 Punkten Abstand', () => {
    const [a = 0, b = 0] = fitElo([
      [0, 1000],
      [100, 0],
    ]);
    expect(a - b).toBeGreaterThan(395);
    expect(a - b).toBeLessThan(405);
  });

  it('ordnet eine klare Rangfolge richtig ein', () => {
    const records = [
      ...Array.from({ length: 30 }, () => duel(0, 1)),
      ...Array.from({ length: 30 }, () => duel(1, 2)),
      ...Array.from({ length: 30 }, () => duel(0, 2)),
      ...Array.from({ length: 5 }, () => duel(2, 0)),
    ];
    const [a = 0, b = 0, c = 0] = fitElo(pairwiseWins(records, 3));
    expect(a).toBeGreaterThan(b);
    expect(b).toBeGreaterThan(c);
  });

  it('hängt nicht von der Reihenfolge der Runden ab', () => {
    const records = [duel(0, 1), duel(0, 1), duel(1, 0), duel(1, 2), duel(2, 0)];
    expect(fitElo(pairwiseWins(records, 3))).toEqual(
      fitElo(pairwiseWins([...records].reverse(), 3)),
    );
  });

  it('bleibt endlich, auch wenn jemand nie verliert', () => {
    const ratings = fitElo(
      pairwiseWins(
        Array.from({ length: 20 }, () => duel(0, 1)),
        2,
      ),
    );
    expect(ratings.every(Number.isFinite)).toBe(true);
  });
});
