import { describe, expect, it } from 'vitest';
import { faceFor, seatPositions } from './display.ts';
import { hidden, known, viewWith } from './test-views.ts';

describe('Sitzordnung', () => {
  it('setzt einen Gegner oben, drei links, oben und rechts, fünf zusätzlich oben links und rechts', () => {
    expect(seatPositions(1)).toEqual(['top']);
    expect(seatPositions(3)).toEqual(['left', 'top', 'right']);
    expect(seatPositions(5)).toEqual(['left', 'top-left', 'top', 'top-right', 'right']);
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

  it('deckt am Rundenende auf', () => {
    expect(faceFor(viewWith({ hands, phase: 'roundOver' }), 1, 0, null).kind).toBe('face');
  });
});
