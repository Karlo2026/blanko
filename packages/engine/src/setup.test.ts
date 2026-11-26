import { describe, expect, it } from 'vitest';
import { cardOf, DECK_SIZE } from './cards.ts';
import { knows } from './knowledge.ts';
import { legalActions } from './legal.ts';
import { createRng } from './rng.ts';
import { startRound } from './setup.ts';
import { play } from './test-support.ts';

describe('Vorbereitung', () => {
  it.each([2, 3, 4, 5, 6])(
    'gibt bei %i Spielern jedem 4 verdeckte Karten im 2×2-Quadrat',
    (playerCount) => {
      const state = startRound({ playerCount, dealer: 0 }, createRng(1));
      expect(state.hands).toHaveLength(playerCount);
      for (const hand of state.hands) {
        expect(hand).toHaveLength(4);
        expect(hand.every((slot) => slot !== null)).toBe(true);
      }
      expect(state.drawPile).toHaveLength(DECK_SIZE - 4 * playerCount - 1);
    },
  );

  it('lässt jeden nur seine zwei unteren Karten kennen', () => {
    const state = startRound({ playerCount: 3, dealer: 0 }, createRng(2));
    state.hands.forEach((hand, owner) => {
      hand.forEach((card, slot) => {
        if (card === null) throw new Error('unerwartet leer');
        for (let player = 0; player < 3; player++) {
          expect(knows(state.knowledge, card, player)).toBe(player === owner && slot >= 2);
        }
      });
    });
  });

  it('deckt die oberste Karte als Ablagestapel für alle sichtbar auf', () => {
    const state = startRound({ playerCount: 4, dealer: 0 }, createRng(3));
    expect(state.discardPile).toHaveLength(1);
    const start = state.discardPile[0] ?? -1;
    for (let player = 0; player < 4; player++) {
      expect(knows(state.knowledge, start, player)).toBe(true);
    }
  });

  it('lässt den Spieler links vom Geber beginnen', () => {
    expect(startRound({ playerCount: 4, dealer: 1 }, createRng(1)).current).toBe(2);
    expect(startRound({ playerCount: 4, dealer: 3 }, createRng(1)).current).toBe(0);
  });

  it('erlaubt nur 2 bis 6 Spieler und einen gültigen Geber', () => {
    expect(() => startRound({ playerCount: 1, dealer: 0 }, createRng(1))).toThrow(RangeError);
    expect(() => startRound({ playerCount: 7, dealer: 0 }, createRng(1))).toThrow(RangeError);
    expect(() => startRound({ playerCount: 3, dealer: 3 }, createRng(1))).toThrow(RangeError);
  });

  it('erlaubt das Ansehen der unteren Karten nur bis zum ersten eigenen Ziehen', () => {
    const state = startRound({ playerCount: 3, dealer: 2 }, createRng(4));
    expect(state.canStillPeek).toEqual([true, true, true]);
    const after = play(state, [{ type: 'draw' }]).state;
    expect(after.canStillPeek).toEqual([false, true, true]);
  });

  it('A2: erlaubt dem ersten Spieler einen Gleiche-Karte-Zug auf die Startkarte (Hausregel)', () => {
    const state = startRound({ playerCount: 2, dealer: 0 }, createRng(5));
    const start = state.discardPile[0] ?? -1;
    expect(state.matchableRank).toBe(cardOf(start).rank);
    expect(legalActions(state).filter((a) => a.type === 'matchDiscard')).toHaveLength(4);
  });
});
