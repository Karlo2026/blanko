import { MAX_PLAYERS, MIN_PLAYERS } from '@blanko/engine';
import { splitIntoChunks } from './chunk.ts';
import { fitElo, pairwiseWins } from './elo.ts';
import type { Entrant } from './entrant.ts';
import { runChunks } from './parallel.ts';
import type { RunResult } from './report.ts';
import { summarize } from './stats.ts';

export interface RunOptions {
  readonly games: number;
  readonly seed: number;
  readonly workers: number;
}

function assertPlayerCount(playerCount: number): void {
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new Error(
      `Spielerzahl muss zwischen ${String(MIN_PLAYERS)} und ${String(MAX_PLAYERS)} liegen`,
    );
  }
}

/**
 * simulate: feste Besetzung, ein Platz je Eintrag in `seats`. Mehrfachnennung ist erlaubt,
 * etwa „basis,basis,zufall,zufall“; gleiche Profile werden zusammengefasst ausgewertet.
 */
export async function simulate(seats: readonly Entrant[], options: RunOptions): Promise<RunResult> {
  assertPlayerCount(seats.length);
  const entrants = [...new Map(seats.map((e) => [e.id, e])).values()];
  const plan = {
    kind: 'fixed' as const,
    seats: seats.map((s) => entrants.findIndex((e) => e.id === s.id)),
  };
  const records = await runChunks(
    splitIntoChunks({ entrants, plan }, options.games, options.seed),
    options.workers,
  );
  return {
    command: 'simulate',
    options: { seats: seats.map((s) => s.id), games: options.games, seed: options.seed },
    summary: summarize(
      records,
      entrants.map((e) => e.id),
    ),
  };
}

/** tournament: jede Runde eine neu geloste Besetzung, Ergebnis ist eine Elo-Wertung je Profil. */
export async function tournament(
  entrants: readonly Entrant[],
  playerCount: number,
  options: RunOptions,
): Promise<RunResult> {
  assertPlayerCount(playerCount);
  if (entrants.length < 2) {
    throw new Error('Ein Turnier braucht mindestens zwei Profile');
  }
  const plan = { kind: 'rotating' as const, entrantCount: entrants.length, playerCount };
  const records = await runChunks(
    splitIntoChunks({ entrants, plan }, options.games, options.seed),
    options.workers,
  );
  const ids = entrants.map((e) => e.id);
  const ratings = fitElo(pairwiseWins(records, entrants.length));
  return {
    command: 'tournament',
    options: { profiles: ids, players: playerCount, games: options.games, seed: options.seed },
    summary: summarize(records, ids),
    elo: Object.fromEntries(ids.map((id, i) => [id, Math.round(ratings[i] ?? 0)])),
  };
}
