import { describe, expect, it } from 'vitest';
import { cardOf, type Rank } from './cards.ts';
import { knows } from './knowledge.ts';
import { legalActions } from './legal.ts';
import { card, play, scenario } from './test-support.ts';
import { getPlayerView } from './view.ts';

const hands = () => [
  [card(1), card(2), card(3), card(4)],
  [card(5), card(6), card(7), card(11)],
  [card(12), card(13), card(1, 'hearts'), card(2, 'hearts')],
];

/** Spieler 0 hat eine Karte des angegebenen Rangs gezogen. */
const holding = (rank: Rank, knocker: number | null = null) =>
  scenario({
    hands: hands(),
    phase: { kind: 'drawn', card: card(rank, 'spades') },
    knocker,
    turnsAfterKnock: knocker === null ? 0 : 2,
  });

/** Spieler 0 hat eine Karte des angegebenen Rangs gezogen und gleich offen abgelegt. */
const discarded = (rank: Rank, knocker: number | null = null) =>
  play(holding(rank, knocker), [{ type: 'discardDrawn' }]).state;

describe('Sonderkarten', () => {
  it('8: schaut nach dem Ablegen eine eigene Karte an', () => {
    const { state, events } = play(holding(8), [
      { type: 'discardDrawn' },
      { type: 'peekOwn', slot: 0 },
    ]);
    expect(knows(state.knowledge, card(1), 0)).toBe(true);
    expect(knows(state.knowledge, card(1), 1)).toBe(false);
    expect(state.discardPile.at(-1)).toBe(card(8, 'spades'));
    expect(events.map((e) => e.type)).toEqual(['discarded', 'peekedOwn']);
    expect(state.current).toBe(1);
  });

  it('9: schaut nach dem Ablegen eine Karte eines Gegners an', () => {
    const { state } = play(holding(9), [
      { type: 'discardDrawn' },
      { type: 'peekOpponent', target: 2, targetSlot: 1 },
    ]);
    expect(knows(state.knowledge, card(13), 0)).toBe(true);
    expect(knows(state.knowledge, card(13), 1)).toBe(false);
  });

  it('10: tauscht blind, und das Wissen wandert mit der Karte', () => {
    // Spieler 0 kennt seine Karte auf Platz 2 (eine 3) vorher.
    const start = holding(10);
    const known = { ...start, knowledge: start.knowledge.map((m, id) => (id === card(3) ? 1 : m)) };
    const { state } = play(known, [
      { type: 'discardDrawn' },
      { type: 'blindSwap', slot: 2, target: 1, targetSlot: 0 },
    ]);
    expect(state.hands[0]?.[2]).toBe(card(5));
    expect(state.hands[1]?.[0]).toBe(card(3));
    const view = getPlayerView(state, 0);
    expect(view.hands[1]?.[0]).toEqual({ kind: 'known', card: cardOf(card(3)) });
    expect(view.hands[0]?.[2]).toEqual({ kind: 'hidden' });
  });

  it('wartet nach dem Ablegen auf die Wirkung; Verzichten beendet den Zug ohne Ereignis', () => {
    const state = discarded(8);
    expect(state.phase).toEqual({ kind: 'special', rank: 8 });
    expect(state.current).toBe(0);
    expect(getPlayerView(state, 0).specialRank).toBe(8);
    expect(legalActions(state)).toContainEqual({ type: 'skipSpecial' });
    const { state: after, events } = play(state, [{ type: 'skipSpecial' }]);
    expect(events).toEqual([]);
    expect(after.current).toBe(1);
  });

  it('gilt nur für 8, 9 und 10', () => {
    for (const rank of [1, 2, 3, 4, 5, 6, 7, 11, 12, 13] as const) {
      expect(discarded(rank).phase.kind).toBe('turnStart');
    }
  });

  it('gilt auch, wenn die 8 beim Tauschen aus der Hand abgelegt wird (Hausregel)', () => {
    const state = scenario({
      hands: [
        [card(8), card(2)],
        [card(5), card(6)],
      ],
      phase: { kind: 'drawn', card: card(3, 'spades') },
    });
    const { state: after, events } = play(state, [{ type: 'keep', slot: 0 }]);
    expect(events.map((e) => e.type)).toEqual(['kept']);
    expect(after.phase).toEqual({ kind: 'special', rank: 8 });
  });

  it('gilt auch für eine per Gleiche-Karte-Zug abgelegte 10 (Hausregel)', () => {
    const state = scenario({
      hands: [
        [card(10, 'hearts'), card(2)],
        [card(5), card(6)],
      ],
      discardPile: [card(10)],
      matchableRank: 10,
    });
    const { state: after } = play(state, [{ type: 'matchDiscard', slot: 0 }]);
    expect(after.phase).toEqual({ kind: 'special', rank: 10 });
    expect(legalActions(after).filter((a) => a.type === 'blindSwap')).toHaveLength(2);
  });

  it('gilt nicht, wenn die gezogene 8 behalten wird oder eine 8 falsch abgelegt wird', () => {
    const kept = play(holding(8), [{ type: 'keep', slot: 0 }]);
    expect(kept.state.phase.kind).toBe('turnStart');
    expect(kept.state.current).toBe(1);
    const failed = play(
      scenario({
        hands: [
          [card(8), card(2)],
          [card(5), card(6)],
        ],
        discardPile: [card(7)],
        matchableRank: 7,
      }),
      [{ type: 'matchDiscard', slot: 0 }],
    );
    expect(failed.state.phase.kind).toBe('turnStart');
  });

  it('A6: verbietet den 10-Tausch mit dem Klopfer, erlaubt aber das Anschauen per 9', () => {
    const swapTargets = legalActions(discarded(10, 2)).flatMap((a) =>
      a.type === 'blindSwap' ? [a.target] : [],
    );
    expect(new Set(swapTargets)).toEqual(new Set([1]));
    const peekTargets = legalActions(discarded(9, 2)).flatMap((a) =>
      a.type === 'peekOpponent' ? [a.target] : [],
    );
    expect(new Set(peekTargets)).toEqual(new Set([1, 2]));
  });
});
