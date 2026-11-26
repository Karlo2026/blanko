import type { Action } from '@blanko/engine';
import { describe, expect, it } from 'vitest';
import {
  mainButton,
  NO_SELECTION,
  resolveTap,
  tappableKeys,
  type Selection,
} from './interaction.ts';
import { cardFor, viewWith } from './test-views.ts';

const keeps: Action[] = [0, 1, 2, 3].map((slot) => ({ type: 'keep', slot }));
const opponents = [1, 2].flatMap((target) =>
  [0, 1, 2, 3].map((targetSlot) => ({ target, targetSlot })),
);

describe('Zugbeginn', () => {
  const view = viewWith({ matchableRank: 7 });
  const legal: Action[] = [
    { type: 'draw' },
    { type: 'knock' },
    ...[0, 1, 2, 3].map((slot): Action => ({ type: 'matchDiscard', slot })),
  ];

  it('zieht durch Antippen des Stapels', () => {
    expect(resolveTap(view, legal, NO_SELECTION, { kind: 'drawPile' })).toEqual({
      selection: NO_SELECTION,
      action: { type: 'draw' },
    });
  });

  it('hebt eine eigene Karte an, legt sie per Ablage ab und hebt sie beim zweiten Tipp wieder auf', () => {
    const lifted = resolveTap(view, legal, NO_SELECTION, { kind: 'own', slot: 2 });
    expect(lifted).toEqual({ selection: { kind: 'match', slot: 2 }, action: null });
    const selection: Selection = { kind: 'match', slot: 2 };
    expect(resolveTap(view, legal, selection, { kind: 'discardPile' })?.action).toEqual({
      type: 'matchDiscard',
      slot: 2,
    });
    expect(resolveTap(view, legal, selection, { kind: 'own', slot: 2 })?.selection).toEqual(
      NO_SELECTION,
    );
  });

  it('rahmt nur ein, was reagiert: ohne Gleiche-Karte-Zug nur den Stapel', () => {
    const plain = viewWith({});
    expect(tappableKeys(plain, [{ type: 'draw' }, { type: 'knock' }], NO_SELECTION)).toEqual(
      new Set(['drawPile']),
    );
  });

  it('zeigt Klopfen zu Beginn des Zuges und Abbrechen bei angehobener Karte', () => {
    expect(mainButton(view, legal, NO_SELECTION)).toBe('knock');
    expect(mainButton(view, legal, { kind: 'match', slot: 1 })).toBe('cancel');
  });

  it('reagiert nicht, wenn ein anderer am Zug ist', () => {
    const waiting = viewWith({ current: 1 });
    expect(resolveTap(waiting, legal, NO_SELECTION, { kind: 'drawPile' })).toBeNull();
    expect(mainButton(waiting, legal, NO_SELECTION)).toBeNull();
  });

  it('nimmt online den eigenen Platz aus der Sicht, nicht Platz 0', () => {
    const online = viewWith({ viewer: 2, current: 2, matchableRank: 7 });
    expect(resolveTap(online, legal, NO_SELECTION, { kind: 'drawPile' })?.action).toEqual({
      type: 'draw',
    });
    expect(mainButton(online, legal, NO_SELECTION)).toBe('knock');
    const keys = tappableKeys(online, legal, NO_SELECTION);
    expect(keys.has('own:0')).toBe(true);
    expect(keys.has('opponent:0:0')).toBe(false);
    const othersTurn = viewWith({ viewer: 2, current: 0 });
    expect(resolveTap(othersTurn, legal, NO_SELECTION, { kind: 'drawPile' })).toBeNull();
  });
});

describe('Nach dem Ziehen', () => {
  it('tauscht durch Antippen einer eigenen Karte oder legt per Ablage ab – auch eine 8 sofort', () => {
    const view = viewWith({ phase: 'drawn', drawnCard: cardFor(8) });
    const legal: Action[] = [{ type: 'discardDrawn' }, ...keeps];
    expect(resolveTap(view, legal, NO_SELECTION, { kind: 'own', slot: 1 })?.action).toEqual({
      type: 'keep',
      slot: 1,
    });
    expect(resolveTap(view, legal, NO_SELECTION, { kind: 'discardPile' })?.action).toEqual({
      type: 'discardDrawn',
    });
  });
});

describe('Nach dem Ablegen einer 8, 9 oder 10', () => {
  const special = (rank: 8 | 9 | 10, knocker: number | null = null) =>
    viewWith({ phase: 'special', specialRank: rank, knocker });

  it('8: eigene Karte antippen schaut sie an; verzichten geht nicht (Pflicht)', () => {
    const legal: Action[] = [...[0, 1, 2, 3].map((slot): Action => ({ type: 'peekOwn', slot }))];
    expect(resolveTap(special(8), legal, NO_SELECTION, { kind: 'own', slot: 3 })?.action).toEqual({
      type: 'peekOwn',
      slot: 3,
    });
    expect(resolveTap(special(8), legal, NO_SELECTION, { kind: 'discardPile' })).toBeNull();
    expect(mainButton(special(8), legal, NO_SELECTION)).toBeNull();
  });

  it('9: Gegnerkarte antippen schaut sie an; eigene Karten reagieren nicht', () => {
    const legal: Action[] = [...opponents.map((o): Action => ({ type: 'peekOpponent', ...o }))];
    expect(
      resolveTap(special(9), legal, NO_SELECTION, { kind: 'opponent', player: 2, slot: 0 })?.action,
    ).toEqual({
      type: 'peekOpponent',
      target: 2,
      targetSlot: 0,
    });
    expect(tappableKeys(special(9), legal, NO_SELECTION).has('own:0')).toBe(false);
  });

  it('10: erst die eigene, dann die gegnerische Karte; nicht mit dem Klopfer', () => {
    const view = special(10, 2);
    const swaps = [0, 1, 2, 3].flatMap((slot) =>
      [0, 1, 2, 3].map((targetSlot): Action => ({
        type: 'blindSwap',
        slot,
        target: 1,
        targetSlot,
      })),
    );
    const legal: Action[] = [...swaps];
    expect(resolveTap(view, legal, NO_SELECTION, { kind: 'own', slot: 1 })).toEqual({
      selection: { kind: 'swap', slot: 1 },
      action: null,
    });
    const selection: Selection = { kind: 'swap', slot: 1 };
    expect(
      resolveTap(view, legal, selection, { kind: 'opponent', player: 1, slot: 3 })?.action,
    ).toEqual({
      type: 'blindSwap',
      slot: 1,
      target: 1,
      targetSlot: 3,
    });
    expect(resolveTap(view, legal, selection, { kind: 'opponent', player: 2, slot: 3 })).toBeNull();
    expect(mainButton(view, legal, selection)).toBe('cancel');
    expect(mainButton(view, legal, NO_SELECTION)).toBeNull();
  });
});
