import type { Action, GameEvent, PlayerView, RoundScore } from '@blanko/engine';

/** Raumcodes ohne verwechselbare Zeichen: kein 0/O, kein 1/I/L. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 4;
export const MAX_NAME_LENGTH = 16;
/** WebSocket-Schließcode: Der Server hat die Verbindung absichtlich beendet, nicht neu verbinden. */
export const CLOSE_NO_RETRY = 4000;

/** Nachrichten vom Browser an den Server. */
export type ClientMessage =
  | { readonly type: 'create'; readonly name: string }
  | { readonly type: 'join'; readonly room: string; readonly name: string }
  | { readonly type: 'resume'; readonly room: string; readonly token: string }
  | { readonly type: 'addBot' }
  | { readonly type: 'removeBot'; readonly seat: number }
  | { readonly type: 'setLevel'; readonly level: string }
  | { readonly type: 'start' }
  | { readonly type: 'nextRound' }
  | { readonly type: 'action'; readonly action: Action }
  | { readonly type: 'ping' };

export interface SeatInfo {
  readonly name: string;
  readonly bot: boolean;
  /** Nur für Menschen aussagekräftig; Bots sind immer verbunden. */
  readonly connected: boolean;
}

export interface LevelInfo {
  readonly level: string;
  readonly label: string;
}

/** Lobby vor dem Start, laufende Runde, gewertete Runde (wartet auf „nächste Runde“). */
export type RoomPhase = 'lobby' | 'playing' | 'scored';

export interface LobbyMessage {
  readonly type: 'lobby';
  readonly seats: readonly SeatInfo[];
  readonly host: number;
  readonly level: string;
  readonly levels: readonly LevelInfo[];
  readonly phase: RoomPhase;
}

/**
 * Stand für genau einen Platz: seine Sicht, die öffentlichen Ereignisse der letzten Aktion und seine
 * erlaubten Züge (leer, wenn er nicht am Zug ist).
 */
export interface UpdateMessage {
  readonly type: 'update';
  readonly view: PlayerView;
  readonly events: readonly GameEvent[];
  readonly legal: readonly Action[];
  readonly names: readonly string[];
  readonly totals: readonly number[];
  readonly round: number;
}

/** Nachrichten vom Server an den Browser. */
export type ServerMessage =
  | {
      readonly type: 'joined';
      readonly room: string;
      readonly seat: number;
      readonly token: string;
    }
  | LobbyMessage
  | UpdateMessage
  | { readonly type: 'roundScored'; readonly score: RoundScore }
  | { readonly type: 'error'; readonly text: string };
