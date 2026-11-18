import { availableParallelism } from 'node:os';
import { Worker } from 'node:worker_threads';
import { runChunk, type ChunkTask, type RoundRecord } from './chunk.ts';

export const DEFAULT_WORKERS = availableParallelism();

/** Ein Worker arbeitet Pakete der Reihe nach ab, solange die gemeinsame Warteschlange etwas hat. */
function drainQueue(
  next: () => number | null,
  tasks: readonly ChunkTask[],
  results: RoundRecord[][],
): Promise<void> {
  const worker = new Worker(new URL('./worker.ts', import.meta.url));
  return new Promise((resolve, reject) => {
    const sendNext = (): void => {
      const index = next();
      if (index === null) {
        void worker.terminate().then(() => {
          resolve();
        });
        return;
      }
      worker.once('message', (records: RoundRecord[]) => {
        results[index] = records;
        sendNext();
      });
      worker.postMessage(tasks[index]);
    };
    worker.once('error', reject);
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
  const pool = Array.from({ length: Math.min(workers, tasks.length) }, () =>
    drainQueue(next, tasks, results),
  );
  await Promise.all(pool);
  return results.flat();
}
