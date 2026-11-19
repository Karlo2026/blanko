import { describe, expect, it } from 'vitest';
import { cardOf } from './cards.ts';
import { knows } from './knowledge.ts';
import { legalActions } from './legal.ts';
import { card, play, scenario, topDiscard } from './test-support.ts';

/** Spieler 0 hat gerade eine 7 abgeworfen; Spieler 1 ist dran. */
const afterSevenDiscarded = () =>
  scenario({
    hands: [
      [card(1), card(2), card(3), card(4)],
      [card(7, 'hearts'), card(6), card(5), card(13)],
      [card(7, 'spades'), card(8), card(9), card(10)],
    ],
    current: 1,
    discardPile: [card(7)],
    drawPile: [card(12, 'diamonds'), card(11, 'diamonds')],
    matchableRank: 7,
  });

describe('Gleiche Karte ablegen', () => {
  it('legt eine Karte gleichen Rangs als ganzen Zug ab', () => {
    const { state, events } = play(afterSevenDiscarded(), [{ type: 'matchDiscard', slot: 0 }]);
    expect(topDiscard(state)).toBe(7);
    expect(state.current).toBe(2);
    expect(events).toEqual([
      { type: 'matched', player: 1, slot: 0, card: cardOf(card(7, 'hearts')) },
    ]);
  });

  it('A1: lässt den Platz der abgelegten Karte leer', () => {
    const { state } = play(afterSevenDiscarded(), [{ type: 'matchDiscard', slot: 0 }]);
    expect(state.hands[1]).toEqual([null, card(6), card(5), card(13)]);
  });

  it('erlaubt keinen Gleiche-Karte-Zug, wenn der vorherige Spieler nichts abgeworfen hat', () => {
    const knocked = play(afterSevenDiscarded(), [{ type: 'knock' }]).state;
    expect(legalActions(knocked).some((a) => a.type === 'matchDiscard')).toBe(false);
  });

  it('A3: erlaubt dem nächsten Spieler, die Kette fortzusetzen', () => {
    const { state } = play(afterSevenDiscarded(), [
      { type: 'matchDiscard', slot: 0 },
      { type: 'matchDiscard', slot: 0 },
    ]);
    expect(state.hands[2]?.[0]).toBeNull();
    expect(state.discardPile.slice(-3).map((id) => id % 13)).toEqual([6, 6, 6]);
  });

  it('eine per Gleiche-Karte-Zug abgelegte 8 erlaubt danach die Sonderfunktion (Hausregel)', () => {
    const state = scenario({
      hands: [
        [card(8, 'hearts'), card(2)],
        [card(3), card(4)],
      ],
      discardPile: [card(8)],
      matchableRank: 8,
    });
    const { state: after, events } = play(state, [{ type: 'matchDiscard', slot: 0 }]);
    expect(events.map((e) => e.type)).toEqual(['matched']);
    expect(after.phase).toEqual({ kind: 'special', rank: 8 });
    expect(after.current).toBe(0);
  });
});

describe('Fehler und Strafkarten', () => {
  const failed = () => play(afterSevenDiscarded(), [{ type: 'matchDiscard', slot: 1 }]);

  it('A5: legt die falsche Karte verdeckt zurück, sie ist danach allen bekannt', () => {
    const { state } = failed();
    expect(state.hands[1]?.[1]).toBe(card(6));
    for (let player = 0; player < 3; player++) {
      expect(knows(state.knowledge, card(6), player)).toBe(true);
    }
    expect(topDiscard(state)).toBe(7);
  });

  it('gibt eine Strafkarte, die niemand kennt, auch nicht ihr Besitzer', () => {
    const { state, events } = failed();
    const penalty = card(11, 'diamonds');
    expect(state.hands[1]).toEqual([card(7, 'hearts'), card(6), card(5), card(13), penalty]);
    for (let player = 0; player < 3; player++) {
      expect(knows(state.knowledge, penalty, player)).toBe(false);
    }
    expect(events.at(-1)).toMatchObject({
      type: 'matchFailed',
      player: 1,
      slot: 1,
      penaltySlot: 4,
    });
  });

  it('A1: legt die Strafkarte auf den ersten freien Platz, sonst in eine neue Reihe', () => {
    const state = scenario({
      hands: [[card(1)], [null, card(6), null, card(13)]],
      current: 1,
      discardPile: [card(7)],
      drawPile: [card(12, 'diamonds')],
      matchableRank: 7,
    });
    const { state: after } = play(state, [{ type: 'matchDiscard', slot: 1 }]);
    expect(after.hands[1]).toEqual([card(12, 'diamonds'), card(6), null, card(13)]);
  });

  it('beendet den Zug, und der nächste Spieler darf nicht auf die alte Karte legen', () => {
    const { state } = failed();
    expect(state.current).toBe(2);
    expect(state.matchableRank).toBeNull();
  });

  it('A8: mischt auch für eine Strafkarte neu und lässt die oberste Ablagekarte liegen', () => {
    const state = scenario({
      hands: [[card(1)], [card(6)]],
      current: 1,
      discardPile: [card(2), card(7)],
      drawPile: [],
      matchableRank: 7,
    });
    const { state: after, events } = play(state, [{ type: 'matchDiscard', slot: 0 }]);
    expect(events[0]).toEqual({ type: 'reshuffled' });
    expect(after.discardPile).toEqual([card(7)]);
    expect(after.hands[1]).toEqual([card(6), card(2)]);
  });
});
