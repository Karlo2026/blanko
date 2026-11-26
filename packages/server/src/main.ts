// Mehrspieler-Server: HTTP für /health, WebSocket für die Tische. Start: npm run server
import { randomInt, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { parseProfileFile } from '@blanko/bots';
import { CLOSE_NO_RETRY, type ServerMessage } from '@blanko/protocol';
import { WebSocketServer } from 'ws';
import { createBotPool } from './bot-pool.ts';
import { Hub } from './hub.ts';

const PORT = Number(process.env.PORT ?? 10000);
const ALLOWED_ORIGIN = 'https://karlo2026.github.io';
const BOT_PAUSE_MS = 1200;
const SWEEP_MS = 60_000;

/** Nur die veröffentlichte App und lokale Entwicklung dürfen sich verbinden. */
function originAllowed(origin: string | undefined): boolean {
  if (origin === undefined) return false;
  if (origin === ALLOWED_ORIGIN) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

const profiles = parseProfileFile(
  JSON.parse(readFileSync(join(import.meta.dirname, '../../app/public/profiles.json'), 'utf8')),
);
const pool = createBotPool();
const hub = new Hub({
  levels: profiles.levels,
  runBot: pool.run,
  botPauseMs: BOT_PAUSE_MS,
  now: () => Date.now(),
  randomToken: () => randomUUID(),
  randomInt: (max) => randomInt(max),
});

const server = createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    response.writeHead(200, { 'content-type': 'text/plain' }).end('ok');
    return;
  }
  response.writeHead(404).end();
});

const decoder = new TextDecoder();
const sockets = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
server.on('upgrade', (request, socket, head) => {
  if (!originAllowed(request.headers.origin)) {
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }
  sockets.handleUpgrade(request, socket, head, (ws) => {
    const session = hub.connect({
      send: (message: ServerMessage) => {
        ws.send(JSON.stringify(message));
      },
      close: () => {
        ws.close(CLOSE_NO_RETRY);
      },
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary) return;
      session.receive(decoder.decode(Array.isArray(data) ? Buffer.concat(data) : data));
    });
    ws.on('close', () => {
      session.close();
    });
  });
});

setInterval(() => {
  hub.sweep();
}, SWEEP_MS);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Blanko-Server auf Port ${String(PORT)} (${String(profiles.levels.length)} Stufen)`);
});
