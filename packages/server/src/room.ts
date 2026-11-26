import {
  freeBotName,
  freshMemory,
  recall,
  rememberAll,
  type BotProfile,
  type Level,
  type Memory,
} from '@blanko/bots';
import {
  actionKey,
  applyAction,
  getPlayerView,
  legalActions,
  MAX_PLAYERS,
  MIN_PLAYERS,
  newScoreboard,
  recordRound,
  scoreRound,
  startRound,
  type Action,
  type GameEvent,
  type GameState,
  type PlayerView,
  type Rng,
  type RoundScore,
  type Scoreboard,
} from '@blanko/engine';
import type {
  ClientMessage,
  LobbyMessage,
  RoomPhase,
  ServerMessage,
  UpdateMessage,
} from '@blanko/protocol';

interface RoomSeat {
  readonly name: string;
  readonly kind: 'human' | 'bot';
  /** Nur Menschen: Schlüssel, mit dem der Platz nach einem Verbindungsabbruch zurückgeholt wird. */
  readonly token: string | null;
  readonly connected: boolean;
  /** Seit wann ein Mensch nicht verbunden ist (Millisekunden), sonst null. */
  readonly offlineSince: number | null;
}

/**
 * Ein Tisch auf dem Server. Nur hier liegt der vollständige GameState; Clients sehen ausschließlich
 * getPlayerView für ihren Platz. Der Zufallsgenerator liegt beim Server neben dem Raum und wird
 * hereingereicht, damit die Funktionen hier Reducer bleiben wie applyAction.
 */
export interface Room {
  readonly code: string;
  readonly seats: readonly RoomSeat[];
  /** Platz des Gastgebers; nur er darf Bots, Stufe, Start und nächste Runde. */
  readonly host: number;
  readonly levels: readonly Level[];
  readonly level: string;
  readonly phase: RoomPhase;
  readonly game: GameState | null;
  readonly memories: readonly Memory[];
  readonly board: Scoreboard | null;
  readonly score: RoundScore | null;
}

/** Eine Nachricht an einen Platz. Nicht verbundene Plätze verwirft der Server beim Versand. */
export interface Envelope {
  readonly seat: number;
  readonly message: ServerMessage;
}

export interface RoomResult {
  readonly room: Room;
  readonly outbox: readonly Envelope[];
}

/** Ergebnis von Beitritt oder Rückkehr: der eigene Platz oder ein Fehlertext. */
export type EntryResult = (RoomResult & { readonly seat: number }) | { readonly error: string };

/** Ein Zug, den ein Bot für einen Platz rechnen soll. */
export interface AutomaticMove {
  readonly seat: number;
  readonly profile: BotProfile;
  readonly view: PlayerView;
  readonly legal: readonly Action[];
}

const DEFAULT_LEVEL = 'mittel';

const sameName = (a: string, b: string): boolean => a.toLowerCase() === b.toLowerCase();

const humans = (room: Room): number[] =>
  room.seats.flatMap((seat, index) => (seat.kind === 'human' ? [index] : []));

function profileOf(room: Room): BotProfile {
  const level = room.levels.find((l) => l.level === room.level) ?? room.levels[0];
  if (level === undefined) throw new Error('Raum ohne Stufen');
  return level.profile;
}

function lobbyMessage(room: Room): LobbyMessage {
  return {
    type: 'lobby',
    seats: room.seats.map((seat) => ({
      name: seat.name,
      bot: seat.kind === 'bot',
      connected: seat.kind === 'bot' || seat.connected,
    })),
    host: room.host,
    level: room.level,
    levels: room.levels.map(({ level, label }) => ({ level, label })),
    phase: room.phase,
  };
}

const toHumans = (room: Room, message: ServerMessage): Envelope[] =>
  humans(room).map((seat) => ({ seat, message }));

const error = (room: Room, seat: number, text: string): RoomResult => ({
  room,
  outbox: [{ seat, message: { type: 'error', text } }],
});

/** Stand für genau einen Platz: seine Sicht, die öffentlichen Ereignisse und seine erlaubten Züge. */
function updateFor(room: Room, seat: number, events: readonly GameEvent[]): UpdateMessage | null {
  const { game, board } = room;
  if (game === null || board === null) return null;
  return {
    type: 'update',
    view: getPlayerView(game, seat),
    events,
    legal: game.current === seat && game.phase.kind !== 'roundOver' ? legalActions(game) : [],
    names: room.seats.map((s) => s.name),
    totals: board.totals,
    // Nach der Wertung zählt der Spielstand schon die nächste Runde.
    round: room.phase === 'scored' ? board.round - 1 : board.round,
  };
}

function updatesForAll(room: Room, events: readonly GameEvent[]): Envelope[] {
  return humans(room).flatMap((seat) => {
    const message = updateFor(room, seat, events);
    return message === null ? [] : [{ seat, message }];
  });
}

export function createRoom(
  code: string,
  name: string,
  token: string,
  levels: readonly Level[],
): RoomResult {
  const room: Room = {
    code,
    seats: [{ name, kind: 'human', token, connected: true, offlineSince: null }],
    host: 0,
    levels,
    level: levels.some((l) => l.level === DEFAULT_LEVEL) ? DEFAULT_LEVEL : (levels[0]?.level ?? ''),
    phase: 'lobby',
    game: null,
    memories: [],
    board: null,
    score: null,
  };
  return {
    room,
    outbox: [
      { seat: 0, message: { type: 'joined', room: code, seat: 0, token } },
      ...toHumans(room, lobbyMessage(room)),
    ],
  };
}

/** Beitritt in die Lobby; in ein laufendes Spiel kommt man nur per Rückkehr (resume). */
export function joinRoom(room: Room, name: string, token: string): EntryResult {
  if (room.phase !== 'lobby') return { error: 'Das Spiel läuft schon.' };
  if (room.seats.length >= MAX_PLAYERS) return { error: 'Der Tisch ist voll.' };
  if (room.seats.some((s) => sameName(s.name, name)))
    return { error: `Der Name „${name}“ ist schon vergeben.` };
  const seat = room.seats.length;
  const next: Room = {
    ...room,
    seats: [...room.seats, { name, kind: 'human', token, connected: true, offlineSince: null }],
  };
  return {
    room: next,
    seat,
    outbox: [
      { seat, message: { type: 'joined', room: room.code, seat, token } },
      ...toHumans(next, lobbyMessage(next)),
    ],
  };
}

/** Rückkehr auf den eigenen Platz, auch mitten im Spiel. */
export function resumeRoom(room: Room, token: string): EntryResult {
  const seat = room.seats.findIndex((s) => s.kind === 'human' && s.token === token);
  const current = room.seats[seat];
  if (current === undefined) return { error: 'Dieser Platz ist nicht mehr frei.' };
  const next: Room = {
    ...room,
    seats: room.seats.map((s, i) =>
      i === seat ? { ...s, connected: true, offlineSince: null } : s,
    ),
  };
  const update = updateFor(next, seat, []);
  const outbox: Envelope[] = [
    { seat, message: { type: 'joined', room: room.code, seat, token } },
    ...toHumans(next, lobbyMessage(next)),
  ];
  if (update !== null) outbox.push({ seat, message: update });
  if (next.phase === 'scored' && next.score !== null) {
    outbox.push({ seat, message: { type: 'roundScored', score: next.score } });
  }
  return { room: next, seat, outbox };
}

export function disconnect(room: Room, seat: number, now: number): RoomResult {
  const next: Room = {
    ...room,
    seats: room.seats.map((s, i) =>
      i === seat ? { ...s, connected: false, offlineSince: now } : s,
    ),
  };
  return { room: next, outbox: toHumans(next, lobbyMessage(next)) };
}

function beginRound(room: Room, board: Scoreboard, rng: Rng): RoomResult {
  const game = startRound({ playerCount: room.seats.length, dealer: board.dealer }, rng);
  const next: Room = {
    ...room,
    phase: 'playing',
    game,
    board,
    score: null,
    memories: room.seats.map(() => freshMemory),
  };
  return {
    room: next,
    outbox: [...toHumans(next, lobbyMessage(next)), ...updatesForAll(next, [])],
  };
}

/** Führt einen erlaubten Zug aus; Menschen und Bots landen hier. */
function play(room: Room, action: Action, rng: Rng): RoomResult {
  const { game, board } = room;
  if (game === null || board === null) return { room, outbox: [] };
  const { state, events } = applyAction(game, action, rng);
  // Vergessen gilt nur für Bots; ein vertretener Mensch behält sein volles Wissen.
  const forgetRate = profileOf(room).forgetRate;
  const memories = rememberAll(
    room.memories,
    events,
    state,
    (player) => (room.seats[player]?.kind === 'bot' ? forgetRate : 0),
    rng,
  );
  if (state.phase.kind !== 'roundOver') {
    const next: Room = { ...room, game: state, memories };
    return { room: next, outbox: updatesForAll(next, events) };
  }
  const score = scoreRound(state, rng);
  const next: Room = {
    ...room,
    game: state,
    memories,
    phase: 'scored',
    score,
    board: recordRound(board, score.placementPoints),
  };
  return {
    room: next,
    outbox: [
      ...updatesForAll(next, events),
      ...toHumans(next, { type: 'roundScored', score }),
      ...toHumans(next, lobbyMessage(next)),
    ],
  };
}

function isLegal(game: GameState, action: Action): boolean {
  const key = actionKey(action);
  return legalActions(game).some((a) => actionKey(a) === key);
}

/** Nach dem Entfernen eines Bots rücken spätere Plätze auf; betroffene Menschen erfahren ihren neuen Platz. */
function removeSeat(room: Room, removed: number): RoomResult {
  const seats = room.seats.filter((_, i) => i !== removed);
  const next: Room = { ...room, seats, host: room.host > removed ? room.host - 1 : room.host };
  const moved: Envelope[] = seats.flatMap((seat, i) =>
    seat.kind === 'human' && seat.token !== null && i >= removed
      ? [{ seat: i, message: { type: 'joined', room: room.code, seat: i, token: seat.token } }]
      : [],
  );
  return { room: next, outbox: [...moved, ...toHumans(next, lobbyMessage(next))] };
}

/**
 * Kern der Raum-Logik: verarbeitet eine geprüfte Nachricht eines Platzes und liefert den neuen Raum
 * und die zu verschickenden Nachrichten. Beitritt und Rückkehr laufen über joinRoom und resumeRoom,
 * weil es vorher noch keinen Platz gibt.
 */
export function handle(room: Room, seat: number, message: ClientMessage, rng: Rng): RoomResult {
  const isHost = seat === room.host;
  switch (message.type) {
    case 'ping':
      return { room, outbox: [] };
    case 'create':
    case 'join':
    case 'resume':
      return error(room, seat, 'Du bist schon in diesem Raum.');
    case 'addBot': {
      if (!isHost || room.phase !== 'lobby')
        return error(room, seat, 'Nur der Gastgeber kann vor dem Start Bots hinzufügen.');
      if (room.seats.length >= MAX_PLAYERS) return error(room, seat, 'Der Tisch ist voll.');
      const name = freeBotName(room.seats.map((s) => s.name));
      const next: Room = {
        ...room,
        seats: [
          ...room.seats,
          { name, kind: 'bot', token: null, connected: true, offlineSince: null },
        ],
      };
      return { room: next, outbox: toHumans(next, lobbyMessage(next)) };
    }
    case 'removeBot':
      if (!isHost || room.phase !== 'lobby')
        return error(room, seat, 'Nur der Gastgeber kann vor dem Start Bots entfernen.');
      if (room.seats[message.seat]?.kind !== 'bot')
        return error(room, seat, 'Auf diesem Platz sitzt kein Bot.');
      return removeSeat(room, message.seat);
    case 'setLevel': {
      if (!isHost || room.phase === 'playing')
        return error(room, seat, 'Nur der Gastgeber kann zwischen den Runden die Stufe wählen.');
      if (!room.levels.some((l) => l.level === message.level))
        return error(room, seat, 'Unbekannte Stufe.');
      const next: Room = { ...room, level: message.level };
      return { room: next, outbox: toHumans(next, lobbyMessage(next)) };
    }
    case 'start':
      if (!isHost || room.phase !== 'lobby')
        return error(room, seat, 'Nur der Gastgeber kann das Spiel starten.');
      if (room.seats.length < MIN_PLAYERS)
        return error(room, seat, 'Es braucht mindestens zwei Plätze.');
      return beginRound(room, newScoreboard(room.seats.length, rng), rng);
    case 'nextRound':
      if (!isHost || room.phase !== 'scored' || room.board === null) {
        return error(room, seat, 'Nur der Gastgeber kann die nächste Runde starten.');
      }
      return beginRound(room, room.board, rng);
    case 'action': {
      // applyAction prüft nur, ob ein Zug erlaubt ist, nicht wer ihn schickt. Deshalb hier: nur ein
      // Mensch, nur auf seinem eigenen Platz und nur, wenn er am Zug ist.
      const { game } = room;
      if (
        room.phase !== 'playing' ||
        game === null ||
        room.seats[seat]?.kind !== 'human' ||
        game.current !== seat
      ) {
        return error(room, seat, 'Du bist nicht am Zug.');
      }
      if (!isLegal(game, message.action)) return error(room, seat, 'Dieser Zug ist nicht erlaubt.');
      return play(room, message.action, rng);
    }
  }
}

/** Der Zug, den gerade ein Bot rechnen muss, oder null, wenn ein Mensch am Zug ist. */
export function automaticMove(room: Room): AutomaticMove | null {
  const { game } = room;
  if (room.phase !== 'playing' || game === null || game.phase.kind === 'roundOver') return null;
  const seat = game.current;
  if (room.seats[seat]?.kind !== 'bot') return null;
  return {
    seat,
    profile: profileOf(room),
    view: recall(getPlayerView(game, seat), room.memories[seat] ?? freshMemory),
    legal: legalActions(game),
  };
}

/** Führt einen von einem Bot gerechneten Zug aus, sofern der Tisch noch auf genau diesen Zug wartet. */
export function applyAutomatic(room: Room, seat: number, action: Action, rng: Rng): RoomResult {
  const { game } = room;
  if (
    room.phase !== 'playing' ||
    game === null ||
    game.current !== seat ||
    !isLegal(game, action)
  ) {
    return { room, outbox: [] };
  }
  return play(room, action, rng);
}
