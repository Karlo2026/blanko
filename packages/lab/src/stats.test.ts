import { describe, expect, it } from 'vitest';
import type { RoundRecord } from './chunk.ts';
import { summarize } from './stats.ts';

const rounds: RoundRecord[] = [
  {
    seats: [0, 1],
    placementPoints: [2, -2],
    handPoints: [3, 10],
    ranking: [0, 1],
    knocker: 0,
    turns: 6,
    aborted: false,
  },
  {
    seats: [0, 1],
    placementPoints: [-2, 2],
    handPoints: [8, 4],
    ranking: [1, 0],
    knocker: 0,
    turns: 10,
    aborted: false,
  },
];

describe('summarize', () => {
  it('berechnet Siegquote, Durchschnitte und Klopferfolg je Teilnehmer', () => {
    const summary = summarize(rounds, ['a', 'b']);
    expect(summary.rounds).toBe(2);
    expect(summary.avgTurns).toBe(8);
    expect(summary.abortedRounds).toBe(0);
    expect(summary.entrants[0]).toEqual({
      id: 'a',
      seatsPlayed: 2,
      winRate: 0.5,
      avgPlacementPoints: 0,
      avgHandPoints: 5.5,
      knocks: 2,
      knockSuccessRate: 0.5,
    });
    expect(summary.entrants[1]?.knockSuccessRate).toBeNull();
  });

  it('fasst mehrere Plätze desselben Profils zusammen', () => {
    const record: RoundRecord = {
      seats: [0, 0],
      placementPoints: [2, -2],
      handPoints: [1, 9],
      ranking: [0, 1],
      knocker: null,
      turns: 4,
      aborted: false,
    };
    expect(summarize([record], ['a']).entrants[0]).toMatchObject({
      seatsPlayed: 2,
      winRate: 0.5,
      avgPlacementPoints: 0,
    });
  });
});
