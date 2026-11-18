import { describe, expect, it } from 'vitest';
import { ALL_CARD_IDS, cardOf, rankPoints } from './cards.ts';
import { createRng } from './rng.ts';
import { handPoints, placementPointsByPlace, scoreRound } from './scoring.ts';
import { shuffle } from './shuffle.ts';
import { card, scenario } from './test-support.ts';

describe('Punkte einer Hand', () => {
  it('zählt Ass 1, 2 bis 10 nach Augenzahl und Bilder 10', () => {
    expect(rankPoints(1)).toBe(1);
    for (let rank = 2; rank <= 10; rank++) {
      expect(rankPoints(rank as 2)).toBe(rank);
    }
    expect([11, 12, 13].map((r) => rankPoints(r as 11))).toEqual([10, 10, 10]);
  });

  it('zählt gleiche Ränge nur einmal', () => {
    expect(handPoints([card(13), card(13, 'hearts')])).toBe(10);
    expect(handPoints([card(13), card(12)])).toBe(20);
    expect(handPoints([card(5), card(5, 'hearts'), card(5, 'spades'), card(5, 'diamonds')])).toBe(
      5,
    );
    expect(handPoints([card(2), null, card(2, 'hearts'), card(3)])).toBe(5);
  });
});

describe('Platzierungspunkte', () => {
  it.each([
    [2, [2, -2]],
    [3, [2, 0, -2]],
    [4, [2, 1, -1, -2]],
    [5, [2, 1, 0, -1, -2]],
    [6, [2, 1, 0, 0, -1, -2]],
  ])('entsprechen bei %i Spielern der Tabelle und ergeben in Summe 0', (playerCount, expected) => {
    expect(placementPointsByPlace(playerCount)).toEqual(expected);
    expect(expected.reduce((a, b) => a + b, 0)).toBe(0);
  });
});

/** Handpunkte: Spieler 0 → 3, Spieler 1 → 5, Spieler 2 → 9. */
const hands = () => [[card(3)], [card(5)], [card(9)]];

describe('Platzierung', () => {
  it('sortiert ohne Klopfer nach Punkten', () => {
    const result = scoreRound(scenario({ hands: hands() }), createRng(1));
    expect(result.handPoints).toEqual([3, 5, 9]);
    expect(result.ranking).toEqual([0, 1, 2]);
    expect(result.placementPoints).toEqual([2, 0, -2]);
  });

  it('setzt einen Klopfer, der allein die niedrigste Punktzahl hat, auf Platz 1', () => {
    expect(scoreRound(scenario({ hands: hands(), knocker: 0 }), createRng(1)).ranking).toEqual([
      0, 1, 2,
    ]);
  });

  it('setzt einen Klopfer ohne niedrigste Punktzahl auf den letzten Platz', () => {
    expect(scoreRound(scenario({ hands: hands(), knocker: 1 }), createRng(1)).ranking).toEqual([
      0, 2, 1,
    ]);
  });

  it('setzt den Klopfer auch bei Gleichstand auf den letzten Platz', () => {
    const tied = scenario({ hands: [[card(3)], [card(3, 'hearts')], [card(9)]], knocker: 0 });
    expect(scoreRound(tied, createRng(1)).ranking).toEqual([1, 2, 0]);
  });

  it('löst Gleichstand durch Ziehen aus einem frischen Deck: die niedrigere Karte gewinnt', () => {
    const tied = scenario({ hands: [[card(9)], [card(4)], [card(4, 'hearts')]] });
    let decided = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const deck = shuffle(ALL_CARD_IDS, createRng(seed));
      const [first, second] = deck.map((id) => rankPoints(cardOf(id).rank));
      if (first === undefined || second === undefined || first === second) continue;
      decided++;
      const expected = first < second ? [1, 2, 0] : [2, 1, 0];
      expect(scoreRound(tied, createRng(seed)).ranking).toEqual(expected);
    }
    expect(decided).toBeGreaterThan(20);
  });

  it('zieht bei gleichem Wert erneut, bis entschieden ist', () => {
    const tied = scenario({ hands: [[card(4)], [card(4, 'hearts')]] });
    const seed = Array.from({ length: 200 }, (_, i) => i + 1).find((s) => {
      const [a, b] = shuffle(ALL_CARD_IDS, createRng(s)).map((id) => rankPoints(cardOf(id).rank));
      return a === b;
    });
    expect(seed).toBeDefined();
    const result = scoreRound(tied, createRng(seed ?? 1));
    expect(new Set(result.ranking)).toEqual(new Set([0, 1]));
  });
});
