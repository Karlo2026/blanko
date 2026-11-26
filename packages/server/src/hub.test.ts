import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseProfileFile } from '@blanko/bots';
import type { ServerMessage } from '@blanko/protocol';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EMPTY_ROOM_MS, Hub, type BotRunner, type Client, type Session } from './hub.ts';

const { levels } = parseProfileFile(
  JSON.parse(readFileSync(join(import.meta.dirname, '../../app/public/profiles.json'), 'utf8')),
);
const BOT_PAUSE_MS = 1200;

interface FakeClient extends Client {
  readonly messages: ServerMessage[];
  closed: boolean;
}

function fakeClient(): FakeClient {
  const client: FakeClient = {
    messages: [],
    closed: false,
    send(message) {
      client.messages.push(message);
    },
    close() {
      client.closed = true;
    },
  };
  return client;
}

const of = <T extends ServerMessage['type']>(
  client: FakeClient,
  type: T,
): Extract<ServerMessage, { type: T }>[] =>
  client.messages.filter((m): m is Extract<ServerMessage, { type: T }> => m.type === type);

const last = <T>(items: readonly T[]): T => {
  const item = items.at(-1);
  if (item === undefined) throw new Error('keine Nachricht');
  return item;
};

/** Ein Hub mit steuerbarer Uhr; Bots spielen den ersten erlaubten Zug. */
function testHub(runBot: BotRunner = (request) => Promise.resolve(last(request.legal))) {
  let clock = 0;
  let tokens = 0;
  const hub = new Hub({
    levels,
    runBot,
    botPauseMs: BOT_PAUSE_MS,
    now: () => clock,
    randomToken: () => `00000000-0000-4000-8000-${String(++tokens).padStart(12, '0')}`,
    randomInt: (max) => (clock + tokens) % max,
  });
  const open = (): { client: FakeClient; session: Session } => {
    const client = fakeClient();
    return { client, session: hub.connect(client) };
  };
  const send = (session: Session, message: object): void => {
    session.receive(JSON.stringify(message));
  };
  return {
    hub,
    open,
    send,
    advance: (ms: number): void => {
      clock += ms;
    },
  };
}

/** Anna erstellt einen Raum, Ben tritt bei. */
function twoPlayers() {
  const t = testHub();
  const anna = t.open();
  t.send(anna.session, { type: 'create', name: 'Anna' });
  const room = last(of(anna.client, 'joined')).room;
  const ben = t.open();
  t.send(ben.session, { type: 'join', room: room.toLowerCase(), name: 'Ben' });
  return { ...t, anna, ben, room };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Hub', () => {
  it('verbindet Ersteller und Beitretende mit demselben Raum', () => {
    const { anna, ben, room } = twoPlayers();
    expect(room).toMatch(/^[A-Z2-9]{4}$/);
    expect(last(of(ben.client, 'joined'))).toMatchObject({ room, seat: 1 });
    for (const { client } of [anna, ben]) {
      expect(last(of(client, 'lobby')).seats.map((s) => s.name)).toEqual(['Anna', 'Ben']);
    }
  });

  it('lehnt kaputte, unbekannte und verfrühte Nachrichten ab', () => {
    const t = testHub();
    const { client, session } = t.open();
    session.receive('{kein json');
    t.send(session, { type: 'cheat' });
    t.send(session, { type: 'start' });
    t.send(session, { type: 'join', room: 'ZZZZ', name: 'Anna' });
    expect(client.messages.map((m) => m.type)).toEqual(['error', 'error', 'error', 'error']);
    expect(client.closed).toBe(false);
    expect(t.hub.roomCount).toBe(0);
  });

  it('drosselt eine Verbindung, die zu viele Nachrichten schickt', () => {
    const t = testHub();
    const { client, session } = t.open();
    for (let i = 0; i < 40; i++) t.send(session, { type: 'ping' });
    expect(client.closed).toBe(false);
    t.send(session, { type: 'ping' });
    expect(client.closed).toBe(true);
    expect(last(of(client, 'error')).text).toBe('Zu viele Nachrichten.');
  });

  it('erlaubt nach Ablauf des Zeitfensters wieder Nachrichten', () => {
    const t = testHub();
    const { client, session } = t.open();
    for (let i = 0; i < 40; i++) t.send(session, { type: 'ping' });
    t.advance(10_000);
    for (let i = 0; i < 40; i++) t.send(session, { type: 'ping' });
    expect(client.closed).toBe(false);
  });

  it('schickt jedem Platz nur seine eigene Sicht', () => {
    const { anna, ben, send } = twoPlayers();
    send(anna.session, { type: 'start' });
    expect(of(anna.client, 'update').every((u) => u.view.viewer === 0)).toBe(true);
    expect(of(ben.client, 'update').every((u) => u.view.viewer === 1)).toBe(true);
    expect(of(anna.client, 'update').length).toBeGreaterThan(0);
  });

  it('bringt einen Zurückkehrenden per resume auf denselben Platz', () => {
    const { ben, anna, open, send, room } = twoPlayers();
    send(anna.session, { type: 'start' });
    const { token } = last(of(ben.client, 'joined'));
    ben.session.close();
    expect(last(of(anna.client, 'lobby')).seats[1]?.connected).toBe(false);

    const back = open();
    send(back.session, { type: 'resume', room, token });
    expect(last(of(back.client, 'joined'))).toMatchObject({ seat: 1, token });
    expect(last(of(back.client, 'update')).view.viewer).toBe(1);
    expect(last(of(anna.client, 'lobby')).seats[1]?.connected).toBe(true);
  });

  it('trennt das alte Fenster, wenn derselbe Platz woanders geöffnet wird', () => {
    const { ben, open, send, room } = twoPlayers();
    const { token } = last(of(ben.client, 'joined'));
    const second = open();
    send(second.session, { type: 'resume', room, token });
    expect(ben.client.closed).toBe(true);
    // Das Schließen des alten Fensters meldet den Platz nicht ab.
    ben.session.close();
    expect(last(of(second.client, 'lobby')).seats[1]?.connected).toBe(true);
  });

  it('lässt Bots erst nach der Pause ziehen', async () => {
    const runBot = vi.fn<BotRunner>((request) => Promise.resolve(last(request.legal)));
    const t = testHub(runBot);
    const anna = t.open();
    t.send(anna.session, { type: 'create', name: 'Anna' });
    t.send(anna.session, { type: 'addBot' });
    t.send(anna.session, { type: 'addBot' });
    t.send(anna.session, { type: 'start' });

    // Bis der Mensch dran ist (oder die Runde endet), spielen die Bots allein.
    for (let i = 0; i < 100; i++) {
      const update = last(of(anna.client, 'update'));
      if (update.view.current === 0 || update.view.phase === 'roundOver') break;
      const calls = runBot.mock.calls.length;
      await vi.advanceTimersByTimeAsync(BOT_PAUSE_MS - 1);
      expect(runBot.mock.calls.length).toBe(calls);
      await vi.advanceTimersByTimeAsync(1);
    }
    const update = last(of(anna.client, 'update'));
    expect(update.view.current === 0 || update.view.phase === 'roundOver').toBe(true);
    expect(runBot).toHaveBeenCalled();
    for (const [request] of runBot.mock.calls) expect(request.view.viewer).not.toBe(0);
  });

  it('löscht Räume erst 30 Minuten nachdem der letzte Mensch gegangen ist', () => {
    const { hub, anna, ben, advance } = twoPlayers();
    anna.session.close();
    advance(EMPTY_ROOM_MS);
    hub.sweep();
    expect(hub.roomCount).toBe(1);

    ben.session.close();
    advance(EMPTY_ROOM_MS - 1);
    hub.sweep();
    expect(hub.roomCount).toBe(1);
    advance(1);
    hub.sweep();
    expect(hub.roomCount).toBe(0);
  });
});
