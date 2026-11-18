import { describe, expect, it } from 'vitest';
import { applyAction } from './apply.ts';
import { knows } from './knowledge.ts';
import { legalActions } from './legal.ts';
import { createRng } from './rng.ts';
import { card, play, scenario } from './test-support.ts';

const twoPlayers = () =>
  scenario({
    hands: [
      [card(1), card(2), card(3), card(4)],
      [card(5), card(6), card(7), card(11)],
    ],
    drawPile: [card(12, 'hearts'), card(13, 'hearts')],
    discardPile: [card(9, 'hearts')],
  });

describe('Ziehen', () => {
  it('zeigt die oberste Karte nur dem Ziehenden und beendet den Zug noch nicht', () => {
    const { state } = play(twoPlayers(), [{ type: 'draw' }]);
    expect(state.phase).toEqual({ kind: 'drawn', card: card(13, 'hearts') });
    expect(state.current).toBe(0);
    expect(knows(state.knowledge, card(13, 'hearts'), 0)).toBe(true);
    expect(knows(state.knowledge, card(13, 'hearts'), 1)).toBe(false);
  });

  it('behält die gezogene Karte und legt die ausgetauschte offen ab', () => {
    const { state, events } = play(twoPlayers(), [{ type: 'draw' }, { type: 'keep', slot: 1 }]);
    expect(state.hands[0]?.[1]).toBe(card(13, 'hearts'));
    expect(state.discardPile.at(-1)).toBe(card(2));
    expect(knows(state.knowledge, card(2), 1)).toBe(true);
    expect(state.current).toBe(1);
    expect(events.map((e) => e.type)).toEqual(['drew', 'kept']);
  });

  it('legt die gezogene Karte direkt offen ab', () => {
    const { state } = play(twoPlayers(), [{ type: 'draw' }, { type: 'discardDrawn' }]);
    expect(state.discardPile.at(-1)).toBe(card(13, 'hearts'));
    expect(state.hands[0]).toEqual(twoPlayers().hands[0]);
    expect(state.current).toBe(1);
  });
});

describe('Ablagestapel', () => {
  it('bietet nie an, die oberste Ablagekarte zu nehmen', () => {
    const start = legalActions(twoPlayers()).map((a) => a.type);
    expect(new Set(start)).toEqual(new Set(['draw', 'knock']));
    const drawn = legalActions(play(twoPlayers(), [{ type: 'draw' }]).state).map((a) => a.type);
    expect(new Set(drawn)).toEqual(new Set(['discardDrawn', 'keep']));
  });

  it('A8: mischt bei leerem Nachziehstapel den Ablagestapel ohne die oberste Karte neu', () => {
    const state = scenario({
      hands: [[card(1)], [card(2)]],
      drawPile: [],
      discardPile: [card(3), card(4), card(5)],
    });
    const { state: after, events } = play(state, [{ type: 'draw' }]);
    expect(events[0]).toEqual({ type: 'reshuffled' });
    expect(after.discardPile).toEqual([card(5)]);
    expect(after.drawPile).toHaveLength(1);
    const remaining = after.drawPile[0] ?? -1;
    expect([card(3), card(4)]).toContain(remaining);
    expect(knows(after.knowledge, remaining, 0)).toBe(false);
    expect(knows(after.knowledge, remaining, 1)).toBe(false);
  });
});

describe('applyAction', () => {
  it('lehnt nicht erlaubte Aktionen ab', () => {
    expect(() => applyAction(twoPlayers(), { type: 'keep', slot: 0 }, createRng(1))).toThrow();
  });

  it('verändert den Eingabezustand nicht', () => {
    const state = twoPlayers();
    const snapshot: unknown = JSON.parse(JSON.stringify(state));
    play(state, [{ type: 'draw' }, { type: 'keep', slot: 0 }]);
    expect(state).toEqual(snapshot);
  });

  it('ist bei gleichem Seed reproduzierbar', () => {
    const state = scenario({
      hands: [[card(1)], [card(2)]],
      drawPile: [],
      discardPile: [card(3), card(4), card(5), card(6)],
    });
    expect(play(state, [{ type: 'draw' }], createRng(9)).state).toEqual(
      play(state, [{ type: 'draw' }], createRng(9)).state,
    );
  });
});
