import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseProfileFile } from '@blanko/bots';
import {
  createRng,
  getPlayerView,
  legalActions,
  type Action,
  type GameState,
  type Rng,
} from '@blanko/engine';
import type { ClientMessage, ServerMessage } from '@blanko/protocol';
import { describe, expect, it } from 'vitest';
import {
  applyAutomatic,
  automaticMove,
  createRoom,
  disconnect,
  handle,
  joinRoom,
  resumeRoom,
  type Envelope,
  type Room,
  type RoomResult,
} from './room.ts';

const { levels } = parseProfileFile(
  JSON.parse(readFileSync(join(import.meta.dirname, '../../app/public/profiles.json'), 'utf8')),
);
const TOKENS = ['00000000-0000-4000-8000-000000000000', '11111111-1111-4111-8111-111111111111'];

function entered(result: ReturnType<typeof joinRoom>): RoomResult & { seat: number } {
  if ('error' in result) throw new Error(result.error);
  return result;
}

/** Raum mit Anna (Gastgeberin), Ben und einem Bot, gestartet. */
function startedRoom(seed = 1): { room: Room; outbox: readonly Envelope[] } {
  const rng = createRng(seed);
  let room = createRoom('ABCD', 'Anna', TOKENS[0] ?? '', levels).room;
  room = entered(joinRoom(room, 'Ben', TOKENS[1] ?? '')).room;
  room = handle(room, 0, { type: 'addBot' }, rng).room;
  return handle(room, 0, { type: 'start' }, rng);
}

const messagesFor = (
  outbox: readonly Envelope[],
  seat: number,
  type: ServerMessage['type'],
): ServerMessage[] =>
  outbox.filter((e) => e.seat === seat && e.message.type === type).map((e) => e.message);

const errorsFor = (result: RoomResult, seat: number): ServerMessage[] =>
  messagesFor(result.outbox, seat, 'error');

/** Karten-IDs, die Platz `seat` gerade nicht kennen darf: verdeckte Handkarten und fremde gezogene Karten. */
function secretCards(state: GameState, seat: number): Set<number> {
  const view = getPlayerView(state, seat);
  const secret = new Set<number>();
  state.hands.forEach((hand, player) => {
    hand.forEach((card, slot) => {
      if (card !== null && view.hands[player]?.[slot]?.kind === 'hidden') secret.add(card);
    });
  });
  if (state.phase.kind === 'drawn' && state.current !== seat) secret.add(state.phase.card);
  return secret;
}

/** Alle Karten-IDs, die irgendwo in einer serialisierten Nachricht stecken. */
function serializedCardIds(message: ServerMessage): number[] {
  const ids: number[] = [];
  JSON.parse(JSON.stringify(message), (_key: string, value: unknown) => {
    if (
      typeof value === 'object' &&
      value !== null &&
      'rank' in value &&
      'suit' in value &&
      'id' in value
    ) {
      ids.push((value as { id: number }).id);
    }
    return value;
  });
  return ids;
}

describe('Beitritt', () => {
  it('macht den Ersteller zum Gastgeber auf Platz 0', () => {
    const { room, outbox } = createRoom('ABCD', 'Anna', TOKENS[0] ?? '', levels);
    expect(room.host).toBe(0);
    expect(messagesFor(outbox, 0, 'joined')).toEqual([
      { type: 'joined', room: 'ABCD', seat: 0, token: TOKENS[0] },
    ]);
    expect(messagesFor(outbox, 0, 'lobby')).toHaveLength(1);
  });

  it('verlangt eindeutige Namen und höchstens sechs Plätze', () => {
    const rng = createRng(1);
    let room = createRoom('ABCD', 'Anna', TOKENS[0] ?? '', levels).room;
    expect(joinRoom(room, 'anna', TOKENS[1] ?? '')).toEqual({
      error: 'Der Name „anna“ ist schon vergeben.',
    });
    for (let i = 0; i < 5; i++) room = handle(room, 0, { type: 'addBot' }, rng).room;
    expect(new Set(room.seats.map((s) => s.name)).size).toBe(6);
    expect(joinRoom(room, 'Ben', TOKENS[1] ?? '')).toEqual({ error: 'Der Tisch ist voll.' });
    expect(errorsFor(handle(room, 0, { type: 'addBot' }, rng), 0)).toHaveLength(1);
  });

  it('lässt in ein laufendes Spiel nur per Rückkehr', () => {
    const { room } = startedRoom();
    expect(joinRoom(room, 'Cleo', '22222222-2222-4222-8222-222222222222')).toEqual({
      error: 'Das Spiel läuft schon.',
    });
    const back = entered(resumeRoom(disconnect(room, 1, 0).room, TOKENS[1] ?? ''));
    expect(back.seat).toBe(1);
    expect(messagesFor(back.outbox, 1, 'update')).toHaveLength(1);
    expect(resumeRoom(room, '33333333-3333-4333-8333-333333333333')).toEqual({
      error: 'Dieser Platz ist nicht mehr frei.',
    });
  });
});

describe('Gastgeber-Rechte', () => {
  it('erlaubt nur dem Gastgeber Bots, Stufe und Start', () => {
    const rng = createRng(1);
    const room = entered(
      joinRoom(createRoom('ABCD', 'Anna', TOKENS[0] ?? '', levels).room, 'Ben', TOKENS[1] ?? ''),
    ).room;
    for (const message of [
      { type: 'addBot' },
      { type: 'setLevel', level: 'stark' },
      { type: 'start' },
      { type: 'nextRound' },
    ] satisfies ClientMessage[]) {
      const result = handle(room, 1, message, rng);
      expect(errorsFor(result, 1)).toHaveLength(1);
      expect(result.room).toBe(room);
    }
  });

  it('meldet verschobenen Menschen ihren neuen Platz, wenn ein Bot vor ihnen entfernt wird', () => {
    const rng = createRng(1);
    let room = createRoom('ABCD', 'Anna', TOKENS[0] ?? '', levels).room;
    room = handle(room, 0, { type: 'addBot' }, rng).room;
    room = entered(joinRoom(room, 'Ben', TOKENS[1] ?? '')).room;
    const result = handle(room, 0, { type: 'removeBot', seat: 1 }, rng);
    expect(result.room.seats.map((s) => s.name)).toEqual(['Anna', 'Ben']);
    expect(messagesFor(result.outbox, 1, 'joined')).toEqual([
      { type: 'joined', room: 'ABCD', seat: 1, token: TOKENS[1] },
    ]);
  });
});

/** Ein Schritt am Tisch: Bots über applyAutomatic, Menschen per Nachricht mit dem gewählten Zug. */
function step(room: Room, rng: Rng, choose: (legal: readonly Action[]) => Action): RoomResult {
  const game = room.game;
  if (game === null) throw new Error('kein Spiel');
  const auto = automaticMove(room);
  if (auto !== null) return applyAutomatic(room, auto.seat, choose(auto.legal), rng);
  return handle(room, game.current, { type: 'action', action: choose(legalActions(game)) }, rng);
}

const first = (legal: readonly Action[]): Action => {
  const action = legal[0];
  if (action === undefined) throw new Error('kein Zug');
  return action;
};

/** Klopft, sobald es geht; sonst der erste erlaubte Zug. So endet jede Runde schnell. */
const knockEarly = (legal: readonly Action[]): Action =>
  legal.find((a) => a.type === 'knock') ?? first(legal);

describe('Datenschutz am Tisch', () => {
  it('schickt jedem Platz genau seine Sicht und keine Karte, die er nicht kennt', () => {
    for (let seed = 1; seed <= 20; seed++) {
      let { room, outbox } = startedRoom(seed);
      const rng = createRng(seed + 100);
      for (let i = 0; i < 40 && room.phase === 'playing'; i++) {
        const game = room.game;
        if (game === null) break;
        for (const { seat, message } of outbox) {
          if (message.type !== 'update') continue;
          expect(message.view).toEqual(getPlayerView(game, seat));
          const secret = secretCards(game, seat);
          for (const id of serializedCardIds(message)) expect(secret.has(id)).toBe(false);
        }
        ({ room, outbox } = step(room, rng, first));
      }
    }
  });

  it('gibt erlaubte Züge nur dem Platz, der am Zug ist', () => {
    const { room, outbox } = startedRoom();
    const current = room.game?.current;
    for (const { seat, message } of outbox) {
      if (message.type === 'update') expect(message.legal.length > 0).toBe(seat === current);
    }
  });
});

describe('Züge', () => {
  it('lehnt Züge außerhalb der Reihe und unerlaubte Züge ab', () => {
    const { room } = startedRoom(3);
    const rng = createRng(1);
    const current = room.game?.current ?? 0;
    const other = current === 0 ? 1 : 0;
    const outOfTurn = handle(room, other, { type: 'action', action: { type: 'draw' } }, rng);
    expect(outOfTurn.room).toBe(room);
    expect(errorsFor(outOfTurn, other)).toEqual([{ type: 'error', text: 'Du bist nicht am Zug.' }]);
    if (room.seats[current]?.kind === 'human') {
      const illegal = handle(
        room,
        current,
        { type: 'action', action: { type: 'keep', slot: 0 } },
        rng,
      );
      expect(errorsFor(illegal, current)).toEqual([
        { type: 'error', text: 'Dieser Zug ist nicht erlaubt.' },
      ]);
    }
  });

  it('lässt niemanden für einen Bot ziehen', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { room } = startedRoom(seed);
      if (room.game?.current !== 2) continue;
      for (const seat of [0, 1]) {
        expect(
          errorsFor(
            handle(room, seat, { type: 'action', action: { type: 'draw' } }, createRng(1)),
            seat,
          ),
        ).toHaveLength(1);
      }
      expect(automaticMove(room)?.seat).toBe(2);
    }
  });

  it('wertet eine Runde, bucht die Punkte und startet auf Wunsch des Gastgebers die nächste', () => {
    let { room } = startedRoom(5);
    const rng = createRng(9);
    let result: RoomResult = { room, outbox: [] };
    for (let i = 0; i < 200 && room.phase === 'playing'; i++) {
      result = step(room, rng, knockEarly);
      room = result.room;
    }
    expect(room.phase).toBe('scored');
    expect(messagesFor(result.outbox, 0, 'roundScored')).toHaveLength(1);
    expect(room.board?.totals.reduce((a, b) => a + b, 0)).toBe(0);
    expect(room.board?.round).toBe(2);
    expect(errorsFor(handle(room, 1, { type: 'nextRound' }, rng), 1)).toHaveLength(1);
    const next = handle(room, 0, { type: 'nextRound' }, rng);
    expect(next.room.phase).toBe('playing');
    expect(messagesFor(next.outbox, 1, 'update')).toHaveLength(1);
  });
});
