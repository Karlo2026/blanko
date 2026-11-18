import { playRound } from '@blanko/bots';
import { chooseFirstDealer, createRng, nextDealer, scoreRound, startRound } from '@blanko/engine';
import { seatFor, type Entrant } from './entrant.ts';
import { playerCountOf, seatsForRound, type SeatPlan } from './line-up.ts';

/** Ergebnis einer Runde, so knapp, dass hunderttausende in den Speicher passen. */
export interface RoundRecord {
  /** Teilnehmer-Index je Platz. */
  readonly seats: readonly number[];
  readonly placementPoints: readonly number[];
  readonly handPoints: readonly number[];
  /** Plätze in Platzierungsreihenfolge. */
  readonly ranking: readonly number[];
  readonly knocker: number | null;
  readonly turns: number;
}

/** Ein unabhängig ausführbares Arbeitspaket. Reine Daten, damit es an einen Worker geht. */
export interface ChunkTask {
  readonly entrants: readonly Entrant[];
  readonly plan: SeatPlan;
  readonly rounds: number;
  readonly seed: number;
}

/** Spielt die Runden eines Pakets; das Ergebnis hängt nur vom Paket ab. */
export function runChunk(task: ChunkTask): RoundRecord[] {
  const rng = createRng(task.seed);
  const playerCount = playerCountOf(task.plan);
  const seatsByEntrant = task.entrants.map(seatFor);
  let dealer = chooseFirstDealer(playerCount, rng);
  const records: RoundRecord[] = [];
  for (let round = 0; round < task.rounds; round++) {
    const seats = seatsForRound(task.plan, rng);
    const players = seats.map((entrant) => {
      const seat = seatsByEntrant[entrant];
      if (seat === undefined) throw new Error(`Unbekannter Teilnehmer ${String(entrant)}`);
      return seat;
    });
    const final = playRound(startRound({ playerCount, dealer }, rng), players, rng);
    const score = scoreRound(final, rng);
    records.push({
      seats,
      placementPoints: score.placementPoints,
      handPoints: score.handPoints,
      ranking: score.ranking,
      knocker: final.knocker,
      turns: final.turnCount,
    });
    dealer = nextDealer(dealer, playerCount);
  }
  return records;
}

/** Feste Paketgröße: So hängt das Ergebnis nur vom Seed ab, nicht von der Zahl der Worker. */
export const CHUNK_SIZE = 500;

/** Leitet aus dem Lauf-Seed einen eigenen Seed je Paket ab. */
function chunkSeed(seed: number, index: number): number {
  return createRng(seed ^ Math.imul(index + 1, 0x9e3779b1)).nextInt(2 ** 31);
}

export function splitIntoChunks(
  base: Omit<ChunkTask, 'rounds' | 'seed'>,
  totalRounds: number,
  seed: number,
): ChunkTask[] {
  const count = Math.ceil(totalRounds / CHUNK_SIZE);
  return Array.from({ length: count }, (_, index) => ({
    ...base,
    rounds: Math.min(CHUNK_SIZE, totalRounds - index * CHUNK_SIZE),
    seed: chunkSeed(seed, index),
  }));
}
