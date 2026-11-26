import { describe, expect, it } from 'vitest';
import { parseClientMessage, parseName, parseRoomCode, parseServerMessage } from './parse.ts';

const TOKEN = '123e4567-e89b-42d3-a456-426614174000';

describe('parseClientMessage', () => {
  it('liest alle Nachrichtentypen', () => {
    expect(parseClientMessage({ type: 'create', name: '  Anna ' })).toEqual({
      type: 'create',
      name: 'Anna',
    });
    expect(parseClientMessage({ type: 'join', room: 'abcd', name: 'Ben' })).toEqual({
      type: 'join',
      room: 'ABCD',
      name: 'Ben',
    });
    expect(parseClientMessage({ type: 'resume', room: 'XY23', token: TOKEN })).toMatchObject({
      type: 'resume',
    });
    expect(parseClientMessage({ type: 'removeBot', seat: 2 })).toEqual({
      type: 'removeBot',
      seat: 2,
    });
    expect(parseClientMessage({ type: 'setLevel', level: 'stark' })).toEqual({
      type: 'setLevel',
      level: 'stark',
    });
    for (const type of ['addBot', 'start', 'nextRound', 'ping'] as const) {
      expect(parseClientMessage({ type })).toEqual({ type });
    }
    expect(
      parseClientMessage({
        type: 'action',
        action: { type: 'blindSwap', slot: 0, target: 1, targetSlot: 3 },
      }),
    ).toEqual({ type: 'action', action: { type: 'blindSwap', slot: 0, target: 1, targetSlot: 3 } });
  });

  it.each([
    ['kein Objekt', 'hallo'],
    ['unbekannter Typ', { type: 'cheat' }],
    ['unbekanntes Feld', { type: 'start', extra: 1 }],
    ['unbekannter Zug', { type: 'action', action: { type: 'peekAll' } }],
    ['Zug mit fremdem Feld', { type: 'action', action: { type: 'draw', card: 5 } }],
    ['Platz keine ganze Zahl', { type: 'action', action: { type: 'keep', slot: 1.5 } }],
    ['negativer Platz', { type: 'removeBot', seat: -1 }],
    ['falscher Schlüssel', { type: 'resume', room: 'ABCD', token: 'x' }],
  ])('lehnt ab: %s', (_label, message) => {
    expect(() => parseClientMessage(message)).toThrow();
  });
});

describe('Namen und Raumcodes', () => {
  it('trimmt Namen und erlaubt höchstens 16 Zeichen ohne Steuerzeichen', () => {
    expect(parseName('  Grete  ')).toBe('Grete');
    expect(() => parseName('   ')).toThrow();
    expect(() => parseName('x'.repeat(17))).toThrow();
    expect(() => parseName('a\u0007b')).toThrow();
  });

  it('kennt nur Raumcodes ohne verwechselbare Zeichen', () => {
    expect(parseRoomCode(' k7m2 ')).toBe('K7M2');
    for (const bad of ['ABC', 'ABCDE', 'AB0D', 'ABOD', 'AB1D', 'ABID', 'ABLD']) {
      expect(() => parseRoomCode(bad)).toThrow();
    }
  });
});

describe('parseServerMessage', () => {
  it('liest Lobby und Fehler', () => {
    const lobby = {
      type: 'lobby',
      seats: [{ name: 'Anna', bot: false, connected: true }],
      host: 0,
      level: 'mittel',
      levels: [{ level: 'mittel', label: 'Mittel' }],
      phase: 'lobby',
    };
    expect(parseServerMessage(lobby)).toEqual(lobby);
    expect(parseServerMessage({ type: 'error', text: 'Nein' })).toEqual({
      type: 'error',
      text: 'Nein',
    });
    expect(() => parseServerMessage({ ...lobby, phase: 'irgendwas' })).toThrow();
  });
});
