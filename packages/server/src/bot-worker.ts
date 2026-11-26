// worker_thread: rechnet Bot-Züge, damit ein langer ISMCTS-Zug nicht alle Räume blockiert.
import { parentPort } from 'node:worker_threads';
import { createBotAnswerer, type BotRequest, type BotResponse } from '@blanko/bots';

if (parentPort === null) throw new Error('bot-worker.ts muss als Worker gestartet werden');
const port = parentPort;
const answer = createBotAnswerer();
port.on('message', (request: BotRequest) => {
  try {
    port.postMessage(answer(request));
  } catch (error) {
    // Ein Fehler im Bot darf den Tisch nicht anhalten: dann eben der erste erlaubte Zug.
    console.error(error);
    const fallback = request.legal[0];
    if (fallback !== undefined)
      port.postMessage({ id: request.id, action: fallback } satisfies BotResponse);
  }
});
