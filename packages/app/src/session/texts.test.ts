import { describe, expect, it } from 'vitest';
import { cardFor, viewWith } from './test-views.ts';
import { changedSlots, hintText, moveText, offlineText, statusText } from './texts.ts';

const names = ['Du', 'Karl', 'Greta'];

describe('Statuszeile', () => {
  it('beschreibt Züge mit der passenden Verbform und dem richtigen Artikel', () => {
    expect(moveText([{ type: 'discarded', player: 1, card: cardFor(7) }], names, 0)).toBe(
      'Karl legt eine 7 ab.',
    );
    expect(moveText([{ type: 'kept', player: 0, slot: 1, discarded: cardFor(11) }], names, 0)).toBe(
      'Du tauschst und legst einen Buben ab.',
    );
    expect(
      moveText([{ type: 'swapped', player: 2, slot: 0, target: 0, targetSlot: 1 }], names, 0),
    ).toBe('Greta tauscht blind mit dir.');
  });

  it('meldet, wenn jemand keine Karten mehr hat und gewinnt', () => {
    expect(moveText([{ type: 'handEmptied', player: 2 }], names, 0)).toBe(
      'Greta hat keine Karten mehr und gewinnt die Runde!',
    );
    expect(moveText([{ type: 'handEmptied', player: 0 }], names, 0)).toBe(
      'Du hast keine Karten mehr und gewinnst die Runde!',
    );
  });

  it('spricht online den eigenen Platz mit „du“ an, auch wenn er nicht 0 ist', () => {
    const online = ['Anna', 'Ben'];
    expect(moveText([{ type: 'knocked', player: 1 }], online, 1)).toBe('Du klopfst!');
    expect(moveText([{ type: 'knocked', player: 0 }], online, 1)).toBe('Anna klopft!');
    expect(statusText('', names, viewWith({ viewer: 2, current: 2 }))).toBe('Du bist dran.');
  });

  it('sagt, wenn der Tisch auf jemanden wartet, der offline ist', () => {
    const offline = new Set([1]);
    expect(offlineText(names, viewWith({ current: 1 }), offline)).toBe(
      'Karl ist offline, der Tisch wartet.',
    );
    expect(offlineText(names, viewWith({ current: 2 }), offline)).toBe('');
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
    ).toBe('9 abgelegt: Tippe eine Karte eines Gegners, um sie anzuschauen.');
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
