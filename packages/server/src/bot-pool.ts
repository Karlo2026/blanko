import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import type { BotRequest, BotResponse } from '@blanko/bots';
import type { Action } from '@blanko/engine';
import type { BotRunner } from './hub.ts';

/**
 * Feste Zahl von Bot-Workern, Aufträge reihum. Kleine Gratis-Server haben meist einen oder zwei
 * Kerne; mehr Worker als Kerne brächten nichts.
 */
export function createBotPool(size = Math.max(1, Math.min(4, availableParallelism() - 1))): {
  run: BotRunner;
  close: () => Promise<void>;
} {
  const workers = Array.from(
    { length: size },
    () => new Worker(new URL('./bot-worker.ts', import.meta.url)),
  );
  const pending = new Map<number, (action: Action) => void>();
  for (const worker of workers) {
    worker.on('message', (response: BotResponse) => {
      pending.get(response.id)?.(response.action);
      pending.delete(response.id);
    });
  }
  let nextId = 1;
  return {
    run(request) {
      const id = nextId++;
      const worker = workers[id % workers.length];
      return new Promise((resolve, reject) => {
        if (worker === undefined) {
          reject(new Error('Kein Bot-Worker'));
          return;
        }
        pending.set(id, resolve);
        const message: BotRequest = { id, ...request };
        worker.postMessage(message);
      });
    },
    async close() {
      await Promise.all(workers.map((w) => w.terminate()));
    },
  };
}
