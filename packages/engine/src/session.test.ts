import { describe, expect, it } from 'vitest';
import { createRng } from './rng.ts';
import {
  addRoundToTotals,
  chooseFirstDealer,
  newScoreboard,
  nextDealer,
  recordRound,
} from './session.ts';

describe('Sitzung', () => {
  it('A10: bestimmt den ersten Geber zufällig', () => {
    const rng = createRng(1);
    const dealers = new Set(Array.from({ length: 200 }, () => chooseFirstDealer(5, rng)));
    expect(dealers).toEqual(new Set([0, 1, 2, 3, 4]));
  });

  it('A10: lässt den Geber jede Runde im Uhrzeigersinn wechseln', () => {
    expect(nextDealer(0, 4)).toBe(1);
    expect(nextDealer(3, 4)).toBe(0);
  });

  it('summiert die Platzierungspunkte über die Runden', () => {
    const totals = addRoundToTotals(addRoundToTotals([0, 0, 0], [2, 0, -2]), [-2, 2, 0]);
    expect(totals).toEqual([0, 2, -2]);
  });

  it('führt den Spielstand: Summen, Rundennummer und Geber', () => {
    const board = newScoreboard(3, createRng(2));
    expect(board.totals).toEqual([0, 0, 0]);
    expect(board.round).toBe(1);
    const next = recordRound(board, [2, 0, -2]);
    expect(next).toEqual({ totals: [2, 0, -2], round: 2, dealer: (board.dealer + 1) % 3 });
  });
});
