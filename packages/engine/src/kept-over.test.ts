import { describe, expect, it } from 'vitest';
import { ALL_CARD_IDS, cardOf, rankPoints, type CardId } from './cards.ts';
import { determinize } from './determinize.ts';
import { createRng } from './rng.ts';
import { card, play, scenario } from './test-support.ts';
import { getPlayerView } from './view.ts';

/** Nachziehstapel aus allen übrigen Karten, `top` obenauf; so bleibt jede Karte im Spiel. */
function fullDrawPile(hands: readonly (readonly CardId[])[], top: CardId): CardId[] {
  const used = new Set([...hands.flat(), top]);
  return [...ALL_CARD_IDS.filter((id) => !used.has(id)).slice(1), top];
}

/** Spieler 0 zieht ein Ass und behält es auf Platz 1; dafür wirft er seine Dame ab. */
const highHands = [
  [card(4), card(12), card(3), card(2)],
  [card(5), card(6), card(7), card(8)],
];
const lowHands = [
  [card(4), card(3), card(5), card(2)],
  [card(5, 'hearts'), card(6), card(7), card(8)],
];

const afterKeep = () =>
  play(
    scenario({
      hands: highHands,
      drawPile: fullDrawPile(highHands, card(1, 'hearts')),
    }),
    [{ type: 'draw' }, { type: 'keep', slot: 1 }],
  ).state;

describe('Öffentliche Herkunft beim Behalten', () => {
  it('zeigt Gegnern bei der verdeckten Karte, welche Karte dafür abgeworfen wurde', () => {
    const view = getPlayerView(afterKeep(), 1);
    expect(view.hands[0]?.[1]).toEqual({ kind: 'hidden', keptOver: cardOf(card(12)) });
    expect(view.hands[0]?.[0]).toEqual({ kind: 'hidden' });
  });

  it('zeigt nichts zusätzlich, wenn die Karte ohnehin bekannt ist', () => {
    expect(getPlayerView(afterKeep(), 0).hands[0]?.[1]).toEqual({
      kind: 'known',
      card: cardOf(card(1, 'hearts')),
    });
  });

  it('wandert bei einem 10-Tausch mit der Karte', () => {
    const state = afterKeep();
    const ace = card(1, 'hearts');
    const holdingTen = {
      ...state,
      current: 1,
      phase: { kind: 'special' as const, rank: 10 as const },
    };
    const swapped = play(holdingTen, [
      { type: 'blindSwap', slot: 0, target: 0, targetSlot: 1 },
    ]).state;
    expect(swapped.hands[1]?.[0]).toBe(ace);
    expect(getPlayerView(swapped, 0).hands[1]?.[0]).toEqual({ kind: 'known', card: cardOf(ace) });
    expect(swapped.keptOver[ace]).toBe(card(12));
  });

  it('wird beim erneuten Ziehen der Karte zurückgesetzt', () => {
    const state = afterKeep();
    const ace = card(1, 'hearts');
    const recycled = {
      ...state,
      current: 1,
      drawPile: [ace],
      hands: [[card(4), card(9, 'hearts')], state.hands[1] ?? []],
    };
    const drawn = play(recycled, [{ type: 'draw' }]).state;
    expect(drawn.keptOver[ace]).toBeNull();
  });
});

describe('Gegner lesen in der Determinisierung', () => {
  const view = getPlayerView(afterKeep(), 1);

  it('übernimmt die beobachtete Herkunft in den erzeugten Zustand', () => {
    const guess = determinize(view, createRng(1), 1, 0);
    expect(getPlayerView(guess, 1)).toEqual(view);
  });

  it('legt bei voller Gewichtung nur Karten bis zum Wert der abgeworfenen auf den Platz', () => {
    // Für das behaltene Ass wurde eine 3 abgeworfen.
    const lowView = getPlayerView(
      play(scenario({ hands: lowHands, drawPile: fullDrawPile(lowHands, card(1, 'hearts')) }), [
        { type: 'draw' },
        { type: 'keep', slot: 1 },
      ]).state,
      1,
    );
    for (let seed = 1; seed <= 50; seed++) {
      const slot = determinize(lowView, createRng(seed), 1, 1).hands[0]?.[1];
      expect(rankPoints(cardOf(slot ?? 0).rank)).toBeLessThanOrEqual(3);
    }
  });

  it('verschiebt die Verteilung je nach Gewichtung zu niedrigen Karten', () => {
    const lowView = getPlayerView(
      play(scenario({ hands: lowHands, drawPile: fullDrawPile(lowHands, card(1, 'hearts')) }), [
        { type: 'draw' },
        { type: 'keep', slot: 1 },
      ]).state,
      1,
    );
    const average = (reading: number): number => {
      let sum = 0;
      for (let seed = 1; seed <= 300; seed++) {
        sum += Math.min(
          10,
          cardOf(determinize(lowView, createRng(seed), 1, reading).hands[0]?.[1] ?? 0).rank,
        );
      }
      return sum / 300;
    };
    expect(average(0.9)).toBeLessThan(average(0) - 1);
  });
});
