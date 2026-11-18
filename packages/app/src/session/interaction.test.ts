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
});

describe('Nach dem Ziehen', () => {
  it('tauscht durch Antippen einer eigenen Karte oder legt per Ablage ab', () => {
    const view = viewWith({ phase: 'drawn', drawnCard: cardFor(5) });
    const legal: Action[] = [{ type: 'discardDrawn' }, ...keeps];
    expect(resolveTap(view, legal, NO_SELECTION, { kind: 'own', slot: 1 })?.action).toEqual({
      type: 'keep',
      slot: 1,
    });
    expect(resolveTap(view, legal, NO_SELECTION, { kind: 'discardPile' })?.action).toEqual({
      type: 'discardDrawn',
    });
  });

  it('8: Ablage antippen, dann eigene Karte anschauen', () => {
    const view = viewWith({ phase: 'drawn', drawnCard: cardFor(8) });
    const legal: Action[] = [
      { type: 'discardDrawn' },
      ...keeps,
      ...[0, 1, 2, 3].map((slot): Action => ({ type: 'peekOwn', slot })),
    ];
    const special = resolveTap(view, legal, NO_SELECTION, { kind: 'discardPile' });
    expect(special).toEqual({ selection: { kind: 'special', rank: 8 }, action: null });
    expect(
      resolveTap(view, legal, { kind: 'special', rank: 8 }, { kind: 'own', slot: 3 })?.action,
    ).toEqual({
      type: 'peekOwn',
      slot: 3,
    });
  });

  it('9: Ablage antippen, dann Gegnerkarte anschauen; ein zweiter Tipp auf die Ablage verzichtet', () => {
    const view = viewWith({ phase: 'drawn', drawnCard: cardFor(9) });
    const peeks = opponents.map((o): Action => ({ type: 'peekOpponent', ...o }));
    const legal: Action[] = [{ type: 'discardDrawn' }, ...keeps, ...peeks];
    const selection: Selection = { kind: 'special', rank: 9 };
    expect(
      resolveTap(view, legal, selection, { kind: 'opponent', player: 2, slot: 0 })?.action,
    ).toEqual({
      type: 'peekOpponent',
      target: 2,
      targetSlot: 0,
    });
    expect(resolveTap(view, legal, selection, { kind: 'discardPile' })?.action).toEqual({
      type: 'discardDrawn',
    });
    expect(tappableKeys(view, legal, selection).has('own:0')).toBe(false);
  });

  it('10: erst die eigene, dann die gegnerische Karte; nicht mit dem Klopfer', () => {
    const view = viewWith({ phase: 'drawn', drawnCard: cardFor(10), knocker: 2 });
    const swaps = [0, 1, 2, 3].flatMap((slot) =>
      [0, 1, 2, 3].map((targetSlot): Action => ({
        type: 'blindSwap',
        slot,
        target: 1,
        targetSlot,
      })),
    );
    const legal: Action[] = [{ type: 'discardDrawn' }, ...keeps, ...swaps];
    const chosen = resolveTap(view, legal, { kind: 'special', rank: 10 }, { kind: 'own', slot: 1 });
    expect(chosen).toEqual({ selection: { kind: 'swap', slot: 1 }, action: null });
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
  });
});
