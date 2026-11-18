import { createRng } from '@blanko/engine';
import { describe, expect, it } from 'vitest';
import { freshMemory, recall, updateMemory } from './memory.ts';
import { cardFor, hidden, known, makeView } from './test-support.ts';

const view = makeView({
  hands: [
    [known(1), hidden, known(5), hidden],
    [known(9), hidden, hidden, hidden],
  ],
  turnCount: 1,
});

describe('Gedächtnis', () => {
  it('vergisst ohne Vergessensrate nichts', () => {
    const memory = updateMemory(freshMemory, [], view, 0, createRng(1));
    expect(recall(view, memory)).toEqual(view);
  });

  it('vergisst mit Rate 1 nach einem Zug alle bekannten Handkarten', () => {
    const memory = updateMemory(freshMemory, [], view, 1, createRng(1));
    const recalled = recall(view, memory);
    expect(recalled.hands.flat().every((slot) => slot.kind === 'hidden')).toBe(true);
    expect(recalled.discardPile).toEqual(view.discardPile);
  });

  it('vergisst nur einmal pro abgeschlossenem Zug', () => {
    const memory = updateMemory(freshMemory, [], view, 1, createRng(1));
    const sameTurn = updateMemory(
      { forgotten: new Set(), turnCount: 1 },
      [],
      view,
      1,
      createRng(1),
    );
    expect(memory.forgotten.size).toBe(3);
    expect(sameTurn.forgotten.size).toBe(0);
  });

  it('erinnert sich wieder, wenn es die Karte per 8 erneut anschaut', () => {
    const forgotten = updateMemory(freshMemory, [], view, 1, createRng(1));
    const again = updateMemory(
      forgotten,
      [{ type: 'peekedOwn', player: 0, slot: 0 }],
      view,
      0,
      createRng(1),
    );
    expect(recall(view, again).hands[0]?.[0]).toEqual(known(1));
  });

  it('erinnert sich wieder an eine falsch abgelegte Karte, die alle gesehen haben', () => {
    const forgotten = updateMemory(freshMemory, [], view, 1, createRng(1));
    const event = {
      type: 'matchFailed',
      player: 1,
      slot: 0,
      card: cardFor(9),
      penaltySlot: 4,
    } as const;
    const again = updateMemory(forgotten, [event], view, 0, createRng(1));
    expect(recall(view, again).hands[1]?.[0]).toEqual(known(9));
  });
});
