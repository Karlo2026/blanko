import {
  expectInteger,
  expectNumber,
  expectRecord,
  expectString,
  ValidationError,
} from '@blanko/bots';
import type { Action, GameEvent, PlayerView, RoundScore } from '@blanko/engine';
import {
  MAX_NAME_LENGTH,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type ClientMessage,
  type LevelInfo,
  type RoomPhase,
  type SeatInfo,
  type ServerMessage,
} from './messages.ts';

/** Größter sinnvoller Platz- oder Spielerindex; Strafkarten verlängern Hände über 4 Plätze hinaus. */
const MAX_INDEX = 63;
const ROOM_CODE_PATTERN = new RegExp(`^[${ROOM_CODE_ALPHABET}]{${String(ROOM_CODE_LENGTH)}}$`);
const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Nur diese Felder sind erlaubt; alles Weitere gilt als unbekannt und wird abgelehnt. */
function expectKeys(raw: Record<string, unknown>, allowed: readonly string[], path: string): void {
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) throw new ValidationError(`${path}.${key}: unbekanntes Feld`);
  }
}

const index = (value: unknown, path: string): number => expectInteger(value, path, 0, MAX_INDEX);

/** Name getrimmt, 1 bis 16 Zeichen, ohne Steuerzeichen. */
export function parseName(value: unknown, path = 'name'): string {
  if (typeof value !== 'string') throw new ValidationError(`${path}: Text erwartet`);
  const name = value.trim();
  // eslint-disable-next-line no-control-regex -- Steuerzeichen sind genau das, was hier abgelehnt wird.
  if (name.length === 0 || name.length > MAX_NAME_LENGTH || /[\u0000-\u001f\u007f]/.test(name)) {
    throw new ValidationError(`${path}: 1 bis ${String(MAX_NAME_LENGTH)} Zeichen erwartet`);
  }
  return name;
}

/** Raumcode, Kleinbuchstaben und Leerraum werden toleriert. */
export function parseRoomCode(value: unknown, path = 'room'): string {
  if (typeof value !== 'string') throw new ValidationError(`${path}: Text erwartet`);
  const code = value.trim().toUpperCase();
  if (!ROOM_CODE_PATTERN.test(code)) {
    throw new ValidationError(`${path}: ungültiger Raumcode`);
  }
  return code;
}

function parseToken(value: unknown, path: string): string {
  if (typeof value !== 'string' || !TOKEN_PATTERN.test(value)) {
    throw new ValidationError(`${path}: ungültiger Schlüssel`);
  }
  return value;
}

/** Ein Zug, wie ihn die Engine kennt; ob er erlaubt ist, entscheidet erst der Server. */
function parseAction(value: unknown, path = 'action'): Action {
  const raw = expectRecord(value, path);
  switch (raw.type) {
    case 'draw':
    case 'knock':
    case 'discardDrawn':
      expectKeys(raw, ['type'], path);
      return { type: raw.type };
    case 'matchDiscard':
    case 'keep':
    case 'peekOwn':
      expectKeys(raw, ['type', 'slot'], path);
      return { type: raw.type, slot: index(raw.slot, `${path}.slot`) };
    case 'peekOpponent':
      expectKeys(raw, ['type', 'target', 'targetSlot'], path);
      return {
        type: raw.type,
        target: index(raw.target, `${path}.target`),
        targetSlot: index(raw.targetSlot, `${path}.targetSlot`),
      };
    case 'blindSwap':
      expectKeys(raw, ['type', 'slot', 'target', 'targetSlot'], path);
      return {
        type: raw.type,
        slot: index(raw.slot, `${path}.slot`),
        target: index(raw.target, `${path}.target`),
        targetSlot: index(raw.targetSlot, `${path}.targetSlot`),
      };
    default:
      throw new ValidationError(`${path}.type: unbekannter Zug`);
  }
}

/** Prüft eine eingehende Nachricht vollständig; der Server traut nichts, was ein Browser schickt. */
export function parseClientMessage(value: unknown): ClientMessage {
  const raw = expectRecord(value, 'message');
  const only = (...keys: string[]): void => {
    expectKeys(raw, ['type', ...keys], 'message');
  };
  switch (raw.type) {
    case 'create':
      only('name');
      return { type: 'create', name: parseName(raw.name) };
    case 'join':
      only('room', 'name');
      return { type: 'join', room: parseRoomCode(raw.room), name: parseName(raw.name) };
    case 'resume':
      only('room', 'token');
      return {
        type: 'resume',
        room: parseRoomCode(raw.room),
        token: parseToken(raw.token, 'token'),
      };
    case 'removeBot':
      only('seat');
      return { type: 'removeBot', seat: index(raw.seat, 'seat') };
    case 'setLevel':
      only('level');
      return { type: 'setLevel', level: expectString(raw.level, 'level') };
    case 'action':
      only('action');
      return { type: 'action', action: parseAction(raw.action) };
    case 'addBot':
    case 'start':
    case 'nextRound':
    case 'ping':
      only();
      return { type: raw.type };
    default:
      throw new ValidationError('message.type: unbekannte Nachricht');
  }
}

function expectArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) throw new ValidationError(`${path}: Liste erwartet`);
  return value;
}

const numbers = (value: unknown, path: string): number[] =>
  expectArray(value, path).map((n, i) => expectNumber(n, `${path}[${String(i)}]`));

function parseSeat(value: unknown, i: number): SeatInfo {
  const raw = expectRecord(value, `seats[${String(i)}]`);
  if (typeof raw.bot !== 'boolean' || typeof raw.connected !== 'boolean') {
    throw new ValidationError(`seats[${String(i)}]: bot/connected erwartet`);
  }
  return { name: expectString(raw.name, 'name'), bot: raw.bot, connected: raw.connected };
}

function parseLevelInfo(value: unknown, i: number): LevelInfo {
  const raw = expectRecord(value, `levels[${String(i)}]`);
  return { level: expectString(raw.level, 'level'), label: expectString(raw.label, 'label') };
}

function parsePhase(value: unknown): RoomPhase {
  if (value === 'lobby' || value === 'playing' || value === 'scored') return value;
  throw new ValidationError('phase: unbekannt');
}

/**
 * Prüft Nachrichten vom eigenen Server. Sicht, Ereignisse und Wertung stammen aus der Engine des
 * Servers und werden nur in ihrer Form geprüft; das schützt vor Versionskonflikten, nicht vor Angriffen.
 */
export function parseServerMessage(value: unknown): ServerMessage {
  const raw = expectRecord(value, 'message');
  switch (raw.type) {
    case 'joined':
      return {
        type: 'joined',
        room: parseRoomCode(raw.room),
        seat: index(raw.seat, 'seat'),
        token: parseToken(raw.token, 'token'),
      };
    case 'lobby':
      return {
        type: 'lobby',
        seats: expectArray(raw.seats, 'seats').map(parseSeat),
        host: index(raw.host, 'host'),
        level: expectString(raw.level, 'level'),
        levels: expectArray(raw.levels, 'levels').map(parseLevelInfo),
        phase: parsePhase(raw.phase),
      };
    case 'update': {
      const view = expectRecord(raw.view, 'view');
      index(view.viewer, 'view.viewer');
      expectArray(view.hands, 'view.hands');
      const events = expectArray(raw.events, 'events').map((e) => expectRecord(e, 'event'));
      return {
        type: 'update',
        view: view as unknown as PlayerView,
        events: events as unknown as GameEvent[],
        legal: expectArray(raw.legal, 'legal').map((a) => parseAction(a, 'legal')),
        names: expectArray(raw.names, 'names').map((n) => expectString(n, 'names')),
        totals: numbers(raw.totals, 'totals'),
        round: index(raw.round, 'round'),
      };
    }
    case 'roundScored': {
      const score = expectRecord(raw.score, 'score');
      return {
        type: 'roundScored',
        score: {
          handPoints: numbers(score.handPoints, 'score.handPoints'),
          ranking: numbers(score.ranking, 'score.ranking'),
          placementPoints: numbers(score.placementPoints, 'score.placementPoints'),
        } satisfies RoundScore,
      };
    }
    case 'error':
      return { type: 'error', text: expectString(raw.text, 'text') };
    default:
      throw new ValidationError('message.type: unbekannte Nachricht');
  }
}
