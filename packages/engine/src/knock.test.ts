import { describe, expect, it } from 'vitest';
import { legalActions } from './legal.ts';
import { createRng } from './rng.ts';
import { startRound } from './setup.ts';
import { card, play, scenario } from './test-support.ts';

const threePlayers = () =>
  scenario({
    hands: [
      [card(1), card(2), card(3), card(4)],
      [card(5), card(6), card(7), card(11)],
      [card(12), card(13), card(1, 'hearts'), card(2, 'hearts')],
    ],
  });

describe('Klopfen und Rundenende', () => {
  it('ist der ganze Zug', () => {
    const { state, events } = play(threePlayers(), [{ type: 'knock' }]);
    expect(events).toEqual([{ type: 'knocked', player: 0 }]);
    expect(state.knocker).toBe(0);
    expect(state.current).toBe(1);
    expect(state.phase.kind).toBe('turnStart');
  });

  it('gibt jedem anderen Spieler genau noch einen Zug, danach ist die Runde vorbei', () => {
    const afterFirst = play(threePlayers(), [
      { type: 'knock' },
      { type: 'draw' },
      { type: 'discardDrawn' },
    ]);
    expect(afterFirst.state.phase.kind).toBe('turnStart');
    expect(afterFirst.state.current).toBe(2);
    const { state, events } = play(afterFirst.state, [{ type: 'draw' }, { type: 'discardDrawn' }]);
    expect(state.phase.kind).toBe('roundOver');
    expect(events.at(-1)).toEqual({ type: 'roundEnded' });
    expect(legalActions(state)).toEqual([]);
  });

  it('lässt kein zweites Klopfen zu', () => {
    const { state } = play(threePlayers(), [{ type: 'knock' }]);
    expect(legalActions(state).some((a) => a.type === 'knock')).toBe(false);
  });

  it('lässt die Karten des Klopfers unverändert', () => {
    const { state } = play(threePlayers(), [
      { type: 'knock' },
      { type: 'draw' },
      { type: 'discardDrawn' },
      { type: 'draw' },
      { type: 'discardDrawn' },
    ]);
    expect(state.hands[0]).toEqual(threePlayers().hands[0]);
  });

  it('A9: erlaubt das Klopfen schon im ersten Zug', () => {
    const state = startRound({ playerCount: 4, dealer: 0 }, createRng(1));
    expect(legalActions(state)).toContainEqual({ type: 'knock' });
  });
});

describe('A11: erschöpfter Nachziehstapel', () => {
  it('beendet die Runde sofort, wenn der nächste Spieler nicht ziehen kann', () => {
    // Die Strafkarte verbraucht die letzte Karte; danach bleibt nur die oberste Ablagekarte.
    const state = scenario({
      hands: [[card(6)], [card(2)], [card(3)]],
      drawPile: [card(4)],
      discardPile: [card(7)],
      matchableRank: 7,
    });
    const { state: after, events } = play(state, [{ type: 'matchDiscard', slot: 0 }]);
    expect(after.hands[0]).toEqual([card(6), card(4)]);
    expect(after.phase.kind).toBe('roundOver');
    expect(events.at(-1)).toEqual({ type: 'roundEnded' });
  });

  it('lässt eine fällige Strafkarte entfallen, wenn keine Karte mehr verfügbar ist', () => {
    const state = scenario({
      hands: [[card(1)], [card(6)]],
      current: 1,
      drawPile: [],
      discardPile: [card(7)],
      matchableRank: 7,
    });
    const { state: after, events } = play(state, [{ type: 'matchDiscard', slot: 0 }]);
    expect(after.hands[1]).toEqual([card(6)]);
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'matchFailed', penaltySlot: null }),
    );
    expect(after.phase.kind).toBe('roundOver');
  });
});
