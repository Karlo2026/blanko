import { describe, expect, it } from 'vitest';
import {
  inviteLink,
  loadOnline,
  retryDelay,
  roomFromSearch,
  saveOnline,
  serverUrl,
  validName,
} from './online.ts';

const TOKEN = '00000000-0000-4000-8000-000000000001';

function memoryStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const items = new Map<string, string>();
  return {
    getItem: (key) => items.get(key) ?? null,
    setItem: (key, value) => {
      items.set(key, value);
    },
  };
}

describe('Online', () => {
  it('liest die Server-Adresse aus der Umgebung, ohne sie gibt es kein Online', () => {
    expect(serverUrl(undefined)).toBeNull();
    expect(serverUrl(' ')).toBeNull();
    expect(serverUrl('https://blanko.onrender.com/')).toBe('wss://blanko.onrender.com');
    expect(serverUrl('ws://localhost:10000')).toBe('ws://localhost:10000');
  });

  it('nimmt aus Einladungslinks nur gültige Raumcodes', () => {
    expect(roomFromSearch('?raum=abcd')).toBe('ABCD');
    expect(roomFromSearch('?raum=AB0D')).toBeNull();
    expect(roomFromSearch('')).toBeNull();
    const link = inviteLink(
      { origin: 'https://karlo2026.github.io', pathname: '/blanko/' },
      'K7MX',
    );
    expect(link).toBe('https://karlo2026.github.io/blanko/?raum=K7MX');
    expect(roomFromSearch(new URL(link).search)).toBe('K7MX');
  });

  it('prüft Namen wie der Server', () => {
    expect(validName('  Anna ')).toBe('Anna');
    expect(validName('')).toBeNull();
    expect(validName('x'.repeat(17))).toBeNull();
  });

  it('verbindet mit wachsendem Abstand neu, höchstens alle 15 s', () => {
    expect([0, 1, 2, 3].map(retryDelay)).toEqual([500, 1000, 2000, 4000]);
    expect(retryDelay(20)).toBe(15_000);
  });

  it('merkt sich Name und Platz und verwirft Unbrauchbares', () => {
    const storage = memoryStorage();
    expect(loadOnline(storage)).toEqual({ name: '', seat: null });
    const memory = { name: 'Anna', seat: { type: 'resume', room: 'ABCD', token: TOKEN } } as const;
    saveOnline(storage, memory);
    expect(loadOnline(storage)).toEqual(memory);
    storage.setItem('blanko.online.v1', JSON.stringify({ name: 'Anna', seat: { room: 'ABCD' } }));
    expect(loadOnline(storage)).toEqual({ name: 'Anna', seat: null });
    storage.setItem('blanko.online.v1', '{kaputt');
    expect(loadOnline(storage)).toEqual({ name: '', seat: null });
  });
});
