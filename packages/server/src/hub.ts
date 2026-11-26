import type { BotRequest, Level } from '@blanko/bots';
import { createRng, type Action, type GameState, type Rng } from '@blanko/engine';
import {
  parseClientMessage,
  ROOM_CODE_ALPHABET,
  ROOM_CODE_LENGTH,
  type ServerMessage,
} from '@blanko/protocol';
import {
  applyAutomatic,
  automaticMove,
  createRoom,
  disconnect,
  handle,
  joinRoom,
  resumeRoom,
  type Room,
  type RoomResult,
} from './room.ts';

/** Eine Verbindung zu einem Browser, wie der Hub sie braucht. */
export interface Client {
  send(message: ServerMessage): void;
  close(): void;
}

/** Rechnet einen Bot-Zug, in Produktion in einem worker_thread. */
export type BotRunner = (request: Omit<BotRequest, 'id'>) => Promise<Action>;

export interface HubOptions {
  readonly levels: readonly Level[];
  readonly runBot: BotRunner;
  /** Sichtbare Pause vor jedem Bot-Zug. */
  readonly botPauseMs: number;
  readonly now: () => number;
  readonly randomToken: () => string;
  readonly randomInt: (maxExclusive: number) => number;
}

/** Ein Raum ohne verbundene Menschen wird nach dieser Zeit gelöscht. */
export const EMPTY_ROOM_MS = 30 * 60_000;
/** Drosselung: höchstens so viele Nachrichten je Verbindung und Zeitfenster. */
const RATE_LIMIT = { messages: 40, windowMs: 10_000 };

interface RoomEntry {
  room: Room;
  /** Zufall des Raums; liegt hier statt im Raum, damit die Raum-Logik ein Reducer bleibt. */
  readonly rng: Rng;
  /** Verbundene Browser je Platz-Schlüssel (Token); Plätze können sich in der Lobby verschieben. */
  readonly clients: Map<string, Client>;
  /** Seit wann kein Mensch mehr verbunden ist, sonst null. */
  emptySince: number | null;
  /** Ein Bot-Zug ist geplant oder wird gerechnet. */
  botBusy: boolean;
}

/** Zustand einer einzelnen Verbindung. */
export interface Session {
  receive(text: string): void;
  close(): void;
}

/**
 * Hält alle Räume im Speicher, verteilt Nachrichten an die richtigen Plätze und plant Bot-Züge.
 * Die Spielregeln stecken in engine und bots, die Raumregeln in room.ts; hier geht es nur um
 * Verbindungen, Zeit und Speicher.
 */
export class Hub {
  private readonly rooms = new Map<string, RoomEntry>();
  private readonly options: HubOptions;

  constructor(options: HubOptions) {
    this.options = options;
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  connect(client: Client): Session {
    let joined: { code: string; token: string } | null = null;
    const sent: number[] = [];
    return {
      receive: (text) => {
        const now = this.options.now();
        sent.push(now);
        while ((sent[0] ?? now) <= now - RATE_LIMIT.windowMs) sent.shift();
        if (sent.length > RATE_LIMIT.messages) {
          client.send({ type: 'error', text: 'Zu viele Nachrichten.' });
          client.close();
          return;
        }
        try {
          const message = parseClientMessage(JSON.parse(text));
          joined = this.dispatch(client, joined, message) ?? joined;
        } catch (e) {
          client.send({
            type: 'error',
            text: e instanceof Error ? e.message : 'Ungültige Nachricht.',
          });
        }
      },
      close: () => {
        if (joined !== null) this.leave(joined.code, joined.token, client);
      },
    };
  }

  /** Verarbeitet eine geprüfte Nachricht; liefert den Raum, in dem die Verbindung jetzt sitzt. */
  private dispatch(
    client: Client,
    joined: { code: string; token: string } | null,
    message: ReturnType<typeof parseClientMessage>,
  ): { code: string; token: string } | null {
    if (message.type === 'create') {
      if (joined !== null) throw new Error('Du bist schon in einem Raum.');
      const code = this.newCode();
      const token = this.options.randomToken();
      const result = createRoom(code, message.name, token, this.options.levels);
      const entry: RoomEntry = {
        room: result.room,
        rng: createRng(this.options.randomInt(2 ** 31)),
        clients: new Map([[token, client]]),
        emptySince: null,
        botBusy: false,
      };
      this.rooms.set(code, entry);
      this.deliver(entry, result);
      return { code, token };
    }
    if (message.type === 'join' || message.type === 'resume') {
      if (joined !== null) throw new Error('Du bist schon in einem Raum.');
      const entry = this.rooms.get(message.room);
      if (entry === undefined) throw new Error('Diesen Raum gibt es nicht (mehr).');
      const token = message.type === 'join' ? this.options.randomToken() : message.token;
      const result =
        message.type === 'join'
          ? joinRoom(entry.room, message.name, token)
          : resumeRoom(entry.room, token);
      if ('error' in result) throw new Error(result.error);
      // Ein zweiter Tab mit demselben Platz übernimmt; der alte wird getrennt.
      const previous = entry.clients.get(token);
      if (previous !== undefined && previous !== client) {
        previous.send({
          type: 'error',
          text: 'Dieser Platz wurde in einem anderen Fenster geöffnet.',
        });
        previous.close();
      }
      entry.clients.set(token, client);
      entry.emptySince = null;
      this.deliver(entry, result);
      return { code: message.room, token };
    }
    if (joined === null) throw new Error('Erst einen Raum erstellen oder beitreten.');
    const entry = this.rooms.get(joined.code);
    const seat = entry?.room.seats.findIndex((s) => s.token === joined.token) ?? -1;
    if (entry === undefined || seat === -1) throw new Error('Dieser Raum ist nicht mehr da.');
    this.deliver(entry, handle(entry.room, seat, message, entry.rng));
    return joined;
  }

  private leave(code: string, token: string, client: Client): void {
    const entry = this.rooms.get(code);
    if (entry === undefined || entry.clients.get(token) !== client) return;
    entry.clients.delete(token);
    const seat = entry.room.seats.findIndex((s) => s.token === token);
    if (seat !== -1) this.deliver(entry, disconnect(entry.room, seat, this.options.now()));
    if (entry.clients.size === 0) entry.emptySince = this.options.now();
  }

  /** Übernimmt den neuen Raum, verschickt die Nachrichten und plant gegebenenfalls einen Bot-Zug. */
  private deliver(entry: RoomEntry, result: RoomResult): void {
    entry.room = result.room;
    for (const { seat, message } of result.outbox) {
      const token = entry.room.seats[seat]?.token;
      if (token !== null && token !== undefined) entry.clients.get(token)?.send(message);
    }
    this.scheduleBot(entry);
  }

  /** Nach einer sichtbaren Pause rechnet ein Worker den Zug; gilt nur, wenn der Tisch noch darauf wartet. */
  private scheduleBot(entry: RoomEntry): void {
    if (entry.botBusy) return;
    const move = automaticMove(entry.room);
    if (move === null) return;
    entry.botBusy = true;
    const game: GameState | null = entry.room.game;
    setTimeout(() => {
      // Ein inzwischen gelöschter Raum spielt nicht unsichtbar weiter.
      if (this.rooms.get(entry.room.code) !== entry) return;
      void this.options
        .runBot({
          profile: move.profile,
          view: move.view,
          legal: move.legal,
          seed: entry.rng.nextInt(2 ** 31),
        })
        .then(
          (action) => {
            entry.botBusy = false;
            if (entry.room.game === game)
              this.deliver(entry, applyAutomatic(entry.room, move.seat, action, entry.rng));
            else this.scheduleBot(entry);
          },
          () => {
            entry.botBusy = false;
          },
        );
    }, this.options.botPauseMs);
  }

  /** Löscht Räume, in denen seit EMPTY_ROOM_MS kein Mensch mehr verbunden ist. */
  sweep(): void {
    const now = this.options.now();
    for (const [code, entry] of this.rooms) {
      if (entry.emptySince !== null && now - entry.emptySince >= EMPTY_ROOM_MS)
        this.rooms.delete(code);
    }
  }

  private newCode(): string {
    for (;;) {
      const code = Array.from(
        { length: ROOM_CODE_LENGTH },
        () => ROOM_CODE_ALPHABET[this.options.randomInt(ROOM_CODE_ALPHABET.length)] ?? 'A',
      ).join('');
      if (!this.rooms.has(code)) return code;
    }
  }
}
