import { describe, expect, it } from 'vitest';
import { cardFor, viewWith } from './test-views.ts';
import { changedSlots, hintText, moveText, statusText } from './texts.ts';

const names = ['Du', 'Karl', 'Greta'];

describe('Statuszeile', () => {
  it('beschreibt Züge mit der passenden Verbform und dem richtigen Artikel', () => {
    expect(moveText([{ type: 'discarded', player: 1, card: cardFor(7) }], names)).toBe(
      'Karl legt eine 7 ab.',
    );
    expect(moveText([{ type: 'kept', player: 0, slot: 1, discarded: cardFor(11) }], names)).toBe(
      'Du tauschst und legst einen Buben ab.',
    );
    expect(
      moveText([{ type: 'swapped', player: 2, slot: 0, target: 0, targetSlot: 1 }], names),
    ).toBe('Greta tauscht blind mit dir.');
  });

  it('hängt an, wer gerade zieht, oder dass der Mensch dran ist', () => {
    expect(
      statusText('Karl legt eine 7 ab.', names, viewWith({ phase: 'drawn', current: 2 })),
    ).toBe('Karl legt eine 7 ab. Greta zieht.');
    expect(statusText('Karl legt eine 7 ab.', names, viewWith({}))).toBe(
      'Karl legt eine 7 ab. Du bist dran.',
    );
  });

  it('lässt angeschaute Plätze aufleuchten, Bewegungen nicht', () => {
    expect(changedSlots([{ type: 'peekedOpponent', player: 2, target: 0, targetSlot: 1 }])).toEqual(
      new Set(['0:1']),
    );
    expect(
      changedSlots([{ type: 'swapped', player: 2, slot: 0, target: 0, targetSlot: 1 }]),
    ).toEqual(new Set());
  });
});

describe('Hinweiszeile', () => {
  it('erklärt nach dem Ziehen einer Sonderkarte, was Ablage und eigene Karte bewirken', () => {
    expect(
      hintText(viewWith({ phase: 'drawn', drawnCard: cardFor(8) }), { kind: 'none' }, names, false),
    ).toBe('Ablage antippen: 8 ablegen und ihre Wirkung nutzen. Eigene Karte antippen: tauschen.');
    expect(
      hintText(viewWith({ phase: 'special', specialRank: 9 }), { kind: 'none' }, names, false),
    ).toContain('Ohne Wirkung');
  });

  it('sagt, was gerade geht', () => {
    expect(hintText(viewWith({ matchableRank: 1 }), { kind: 'none' }, names, true)).toBe(
      'Tippe den Stapel zum Ziehen, eine eigene Karte für ein Ass – oder klopfe.',
    );
    expect(hintText(viewWith({ current: 1 }), { kind: 'none' }, names, false)).toBe(
      'Karl ist am Zug.',
    );
  });
});
