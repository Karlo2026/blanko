import { describe, expect, it } from 'vitest';
import { createRng } from './rng.ts';
import { handPoints, scoreRound } from './scoring.ts';
import { card, play, scenario } from './test-support.ts';

/** Spieler 1 hat nur noch eine 7; Spieler 0 hat gerade eine 7 abgeworfen. */
const lastCard = (lastRank: 7 | 8 = 7, knocker: number | null = null) =>
  scenario({
    hands: [
      [card(1), card(2)],
      [null, card(lastRank, 'hearts'), null, null],
      [card(9), card(13)],
    ],
    current: 1,
    discardPile: [card(lastRank)],
    matchableRank: lastRank,
    knocker,
    turnsAfterKnock: knocker === null ? 0 : 2,
  });

describe('Hausregel: keine Karten mehr', () => {
  it('beendet die Runde sofort, wenn ein Spieler seine letzte Karte ablegt', () => {
    const { state, events } = play(lastCard(), [{ type: 'matchDiscard', slot: 1 }]);
    expect(state.phase.kind).toBe('roundOver');
    expect(events.map((e) => e.type)).toEqual(['matched', 'handEmptied', 'roundEnded']);
    expect(events[1]).toEqual({ type: 'handEmptied', player: 1 });
  });

  it('macht den Spieler ohne Karten zum Ersten, die anderen nach Punkten', () => {
    const { state } = play(lastCard(), [{ type: 'matchDiscard', slot: 1 }]);
    expect(handPoints(state.hands[1] ?? [])).toBe(0);
    expect(scoreRound(state, createRng(1)).ranking).toEqual([1, 0, 2]);
  });

  it('gilt auch nach einem Klopfen; der Klopfer ist dann nicht allein der Niedrigste und wird Letzter', () => {
    const { state } = play(lastCard(7, 0), [{ type: 'matchDiscard', slot: 1 }]);
    expect(state.phase.kind).toBe('roundOver');
    expect(scoreRound(state, createRng(1)).ranking).toEqual([1, 2, 0]);
  });

  it('lässt die Wirkung entfallen, wenn die letzte Karte eine 8 ist', () => {
    const { state } = play(lastCard(8), [{ type: 'matchDiscard', slot: 1 }]);
    expect(state.phase.kind).toBe('roundOver');
  });
});
