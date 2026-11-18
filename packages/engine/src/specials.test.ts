import { describe, expect, it } from 'vitest';
import { cardOf, type Rank } from './cards.ts';
import { knows } from './knowledge.ts';
import { legalActions } from './legal.ts';
import { getPlayerView } from './view.ts';
import { card, play, scenario } from './test-support.ts';

/** Spieler 0 hat eine Karte des angegebenen Rangs gezogen. */
const holding = (rank: Rank, knocker: number | null = null) =>
  scenario({
    hands: [
      [card(1), card(2), card(3), card(4)],
      [card(5), card(6), card(7), card(11)],
      [card(12), card(13), card(1, 'hearts'), card(2, 'hearts')],
    ],
    phase: { kind: 'drawn', card: card(rank, 'spades') },
    knocker,
    turnsAfterKnock: knocker === null ? 0 : 2,
  });

describe('Sonderkarten', () => {
  it('8: schaut eine eigene Karte an', () => {
    const { state, events } = play(holding(8), [{ type: 'peekOwn', slot: 0 }]);
    expect(knows(state.knowledge, card(1), 0)).toBe(true);
    expect(knows(state.knowledge, card(1), 1)).toBe(false);
    expect(state.discardPile.at(-1)).toBe(card(8, 'spades'));
    expect(events.map((e) => e.type)).toEqual(['discarded', 'peekedOwn']);
  });

  it('9: schaut eine Karte eines Gegners an', () => {
    const { state } = play(holding(9), [{ type: 'peekOpponent', target: 2, targetSlot: 1 }]);
    expect(knows(state.knowledge, card(13), 0)).toBe(true);
    expect(knows(state.knowledge, card(13), 1)).toBe(false);
  });

  it('10: tauscht blind, und das Wissen wandert mit der Karte', () => {
    // Spieler 0 kennt seine Karte auf Platz 2 (eine 3) vorher.
    const start = holding(10);
    const known = { ...start, knowledge: start.knowledge.map((m, id) => (id === card(3) ? 1 : m)) };
    const { state } = play(known, [{ type: 'blindSwap', slot: 2, target: 1, targetSlot: 0 }]);
    expect(state.hands[0]?.[2]).toBe(card(5));
    expect(state.hands[1]?.[0]).toBe(card(3));
    const view = getPlayerView(state, 0);
    expect(view.hands[1]?.[0]).toEqual({
      kind: 'known',
      card: cardOf(card(3)),
    });
    expect(view.hands[0]?.[2]).toEqual({ kind: 'hidden' });
  });

  it('bietet Sonderfunktionen nur für 8, 9 und 10 an', () => {
    const special = new Set(['peekOwn', 'peekOpponent', 'blindSwap']);
    for (const rank of [1, 2, 3, 4, 5, 6, 7, 11, 12, 13] as const) {
      expect(legalActions(holding(rank)).some((a) => special.has(a.type))).toBe(false);
    }
  });

  it('gewährt keine Sonderfunktion, wenn die 8, 9 oder 10 behalten wird', () => {
    const { state, events } = play(holding(8), [{ type: 'keep', slot: 0 }]);
    expect(events.map((e) => e.type)).toEqual(['kept']);
    expect(state.current).toBe(1);
    expect(state.phase.kind).toBe('turnStart');
  });

  it('A6: verbietet den 10-Tausch mit dem Klopfer, erlaubt aber das Anschauen per 9', () => {
    const swapTargets = legalActions(holding(10, 2)).flatMap((a) =>
      a.type === 'blindSwap' ? [a.target] : [],
    );
    expect(new Set(swapTargets)).toEqual(new Set([1]));
    const peekTargets = legalActions(holding(9, 2)).flatMap((a) =>
      a.type === 'peekOpponent' ? [a.target] : [],
    );
    expect(new Set(peekTargets)).toEqual(new Set([1, 2]));
  });
});
