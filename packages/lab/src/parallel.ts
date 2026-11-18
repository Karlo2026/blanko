import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { runChunk, type ChunkTask, type RoundRecord } from './chunk.ts';

export const DEFAULT_WORKERS = availableParallelism();

/**
 * Worker bleiben zwischen Aufrufen bestehen, weil jeder Start TypeScript neu lädt. Bei `tune` mit
 * hunderten kurzen Messungen machte das sonst den Großteil der Laufzeit aus.
 */
let pool: Worker[] = [];

function workersFor(count: number): Worker[] {
  while (pool.length < count) {
    pool.push(new Worker(new URL('./worker.ts', import.meta.url)));
  }
  return pool.slice(0, count);
}

/** Beendet alle Worker; danach kann der Prozess sich beenden. */
export async function closeWorkers(): Promise<void> {
  const closing = pool;
  pool = [];
  await Promise.all(closing.map((worker) => worker.terminate()));
}

/** Ein Worker arbeitet Pakete der Reihe nach ab, solange die gemeinsame Warteschlange etwas hat. */
function drainQueue(
  worker: Worker,
  next: () => number | null,
  tasks: readonly ChunkTask[],
  results: RoundRecord[][],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (error: unknown): void => {
      reject(error instanceof Error ? error : new Error(String(error)));
    };
    const sendNext = (): void => {
      const index = next();
      if (index === null) {
        worker.off('error', onError);
        resolve();
        return;
      }
      worker.once('message', (records: RoundRecord[]) => {
        results[index] = records;
        sendNext();
      });
      worker.postMessage(tasks[index]);
    };
    worker.on('error', onError);
    sendNext();
  });
}

/**
 * Führt alle Pakete aus und liefert die Runden in Paketreihenfolge.
 * Weil jedes Paket seinen eigenen Seed hat, ist das Ergebnis unabhängig von der Worker-Zahl.
 */
export async function runChunks(
  tasks: readonly ChunkTask[],
  workers: number,
): Promise<RoundRecord[]> {
  if (workers <= 1) {
    return tasks.flatMap(runChunk);
  }
  const results: RoundRecord[][] = [];
  let cursor = 0;
  const next = (): number | null => (cursor < tasks.length ? cursor++ : null);
  await Promise.all(
    workersFor(Math.min(workers, tasks.length)).map((w) => drainQueue(w, next, tasks, results)),
  );
  return results.flat();
}
