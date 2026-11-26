import { parseClientMessage, parseName, parseRoomCode, type ClientMessage } from '@blanko/protocol';

/** Womit man einen Raum betritt: neu erstellen, mit Code beitreten oder auf den alten Platz zurück. */
export type Entry = Extract<ClientMessage, { type: 'create' | 'join' | 'resume' }>;

/** Platz in einem Raum, gespeichert für die Rückkehr per resume. */
export type SavedSeat = Extract<ClientMessage, { type: 'resume' }>;

export interface OnlineMemory {
  readonly name: string;
  readonly seat: SavedSeat | null;
}

/**
 * Adresse des Mehrspieler-Servers aus der Build-Umgebung. Ohne sie gibt es kein „Online spielen“;
 * http(s) wird zu ws(s), damit beides als Einstellung funktioniert.
 */
export function serverUrl(configured: string | undefined): string | null {
  const url = configured?.trim() ?? '';
  return url === '' ? null : url.replace(/^http/, 'ws').replace(/\/$/, '');
}

export const SERVER_URL = serverUrl(import.meta.env.VITE_SERVER_URL);

/** Gültiger Raumcode in Großbuchstaben oder null. */
export function validRoomCode(code: string): string | null {
  try {
    return parseRoomCode(code);
  } catch {
    return null;
  }
}

/** Raumcode aus einem Einladungslink …/?raum=CODE; null, wenn keiner (gültiger) drinsteht. */
export function roomFromSearch(search: string): string | null {
  const code = new URLSearchParams(search).get('raum');
  return code === null ? null : validRoomCode(code);
}

/** Einladungslink zum Raum, gleiche Seite mit ?raum=CODE. */
export function inviteLink(location: Pick<Location, 'origin' | 'pathname'>, room: string): string {
  return `${location.origin}${location.pathname}?raum=${room}`;
}

/** Gültiger Name oder null; Regeln wie auf dem Server. */
export function validName(name: string): string | null {
  try {
    return parseName(name);
  } catch {
    return null;
  }
}

/** Wartezeit vor dem n-ten Wiederverbinden: 0,5 s, 1 s, 2 s … höchstens 15 s. */
export function retryDelay(attempt: number): number {
  return Math.min(15_000, 500 * 2 ** attempt);
}

const KEY = 'blanko.online.v1';

export function loadOnline(storage: Pick<Storage, 'getItem'>): OnlineMemory {
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? 'null') as {
      name?: unknown;
      seat?: unknown;
    } | null;
    const name = typeof parsed?.name === 'string' ? (validName(parsed.name) ?? '') : '';
    const seat = parsed?.seat === undefined || parsed.seat === null ? null : parseSeat(parsed.seat);
    return { name, seat };
  } catch {
    return { name: '', seat: null };
  }
}

function parseSeat(value: unknown): SavedSeat | null {
  try {
    const message = parseClientMessage(value);
    return message.type === 'resume' ? message : null;
  } catch {
    return null;
  }
}

export function saveOnline(storage: Pick<Storage, 'setItem'>, memory: OnlineMemory): void {
  storage.setItem(KEY, JSON.stringify(memory));
}
