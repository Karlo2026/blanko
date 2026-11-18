import { MAX_PLAYERS, MIN_PLAYERS } from '@blanko/engine';
import { splitIntoChunks, type ChunkTask } from './chunk.ts';
import type { Entrant } from './entrant.ts';
import { runChunks } from './parallel.ts';

/** Mittelwert und Standardfehler der Platzierungspunkte eines Herausforderers. */
export interface Fitness {
  readonly mean: number;
  readonly standardError: number;
}

/**
 * Ein Herausforderer gegen lauter Champions, gleich verteilt über 2 bis 6 Spieler.
 * Bei gleicher Stärke ist der Erwartungswert 0. Gleicher Seed heißt gleiche Austeilungen,
 * deshalb lassen sich Kandidaten einer Generation fair vergleichen.
 */
export async function measureChallenger(
  challenger: Entrant,
  champion: Entrant,
  games: number,
  seed: number,
  workers: number,
): Promise<Fitness> {
  const counts = Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => MIN_PLAYERS + i);
  const perCount = Math.max(1, Math.round(games / counts.length));
  const tasks: ChunkTask[] = counts.flatMap((playerCount) =>
    splitIntoChunks(
      {
        entrants: [challenger, champion],
        plan: {
          kind: 'fixed',
          seats: Array.from({ length: playerCount }, (_, seat) => (seat === 0 ? 0 : 1)),
        },
      },
      perCount,
      seed * 31 + playerCount,
    ),
  );
  const points = (await runChunks(tasks, workers)).map((record) => record.placementPoints[0] ?? 0);
  const mean = points.reduce((a, b) => a + b, 0) / points.length;
  const variance =
    points.reduce((sum, p) => sum + (p - mean) ** 2, 0) / Math.max(1, points.length - 1);
  return { mean, standardError: Math.sqrt(variance / points.length) };
}
