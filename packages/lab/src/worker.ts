// Worker-Einstieg: führt Arbeitspakete aus, bis der Hauptthread ihn beendet.
import { parentPort } from 'node:worker_threads';
import { runChunk, type ChunkTask } from './chunk.ts';

if (parentPort === null) {
  throw new Error('worker.ts muss als Worker gestartet werden');
}
const port = parentPort;
port.on('message', (task: ChunkTask) => {
  port.postMessage(runChunk(task));
});
