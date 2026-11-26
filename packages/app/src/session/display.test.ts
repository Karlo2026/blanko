import { describe, expect, it } from 'vitest';
import { faceFor, opponentOrder, seatPositions } from './display.ts';
import { hidden, known, viewWith } from './test-views.ts';

describe('Sitzordnung', () => {
  it('setzt einen Gegner oben, drei links, oben und rechts, fünf zusätzlich oben links und rechts', () => {
    expect(seatPositions(1)).toEqual(['top']);
    expect(seatPositions(3)).toEqual(['left', 'top', 'right']);
    expect(seatPositions(5)).toEqual(['left', 'top-left', 'top', 'top-right', 'right']);
  });
});

describe('gedrehter Tisch', () => {
  it('setzt den eigenen Platz unten, die Gegner im Uhrzeigersinn ab dem nächsten Platz', () => {
    expect(opponentOrder(0, 4)).toEqual([1, 2, 3]);
    expect(opponentOrder(2, 4)).toEqual([3, 0, 1]);
    expect(opponentOrder(1, 2)).toEqual([0]);
  });
});

describe('faceFor', () => {
  const hands = [[known(3), hidden], [known(9), hidden], []];

  it('zeigt eigene bekannte Karten nur bis zum ersten Ziehen', () => {
    expect(faceFor(viewWith({ hands, canStillPeek: true }), 0, 0, null).kind).toBe('face');
    expect(faceFor(viewWith({ hands, canStillPeek: false }), 0, 0, null).kind).toBe('back');
  });

  it('zeigt Gemerktes nicht, eine gerade angeschaute Karte aber schon', () => {
    const view = viewWith({ hands });
    expect(faceFor(view, 1, 0, null).kind).toBe('back');
    expect(faceFor(view, 1, 0, { player: 1, slot: 0 }).kind).toBe('face');
  });

  it('zeigt auch auf einem anderen eigenen Platz die Startkarten', () => {
    const view = viewWith({ hands, viewer: 1, canStillPeek: true });
    expect(faceFor(view, 1, 0, null).kind).toBe('face');
    expect(faceFor(view, 0, 0, null).kind).toBe('back');
  });

  it('deckt am Rundenende auf', () => {
    expect(faceFor(viewWith({ hands, phase: 'roundOver' }), 1, 0, null).kind).toBe('face');
  });
});
