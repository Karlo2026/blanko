import type { RoundRecord } from './chunk.ts';

interface EntrantStats {
  readonly id: string;
  /** Wie oft der Teilnehmer an einem Platz saß. */
  readonly seatsPlayed: number;
  /** Anteil der Runden auf Platz 1. */
  readonly winRate: number;
  readonly avgPlacementPoints: number;
  readonly avgHandPoints: number;
  readonly knocks: number;
  /** Anteil der Klopfer, die allein die niedrigste Hand hatten; null ohne Klopfen. */
  readonly knockSuccessRate: number | null;
}

export interface Summary {
  readonly rounds: number;
  /** Runden, die ohne Klopfen das Zuglimit erreicht haben. */
  readonly abortedRounds: number;
  readonly avgTurns: number;
  readonly entrants: readonly EntrantStats[];
}

interface Tally {
  seats: number;
  wins: number;
  placement: number;
  hand: number;
  knocks: number;
  knockWins: number;
}

const emptyTally = (): Tally => ({
  seats: 0,
  wins: 0,
  placement: 0,
  hand: 0,
  knocks: 0,
  knockWins: 0,
});

function tallyRound(tallies: readonly Tally[], record: RoundRecord): void {
  record.seats.forEach((entrant, seat) => {
    const tally = tallies[entrant];
    if (tally === undefined) return;
    tally.seats++;
    tally.placement += record.placementPoints[seat] ?? 0;
    tally.hand += record.handPoints[seat] ?? 0;
    if (record.ranking[0] === seat) tally.wins++;
    if (record.knocker === seat) {
      tally.knocks++;
      // Ein erfolgreicher Klopfer landet immer auf Platz 1.
      if (record.ranking[0] === seat) tally.knockWins++;
    }
  });
}

export function summarize(records: readonly RoundRecord[], entrantIds: readonly string[]): Summary {
  const tallies = entrantIds.map(emptyTally);
  let turns = 0;
  let aborted = 0;
  for (const record of records) {
    tallyRound(tallies, record);
    turns += record.turns;
    if (record.aborted) aborted++;
  }
  const per = (value: number, count: number): number => (count === 0 ? 0 : value / count);
  return {
    rounds: records.length,
    abortedRounds: aborted,
    avgTurns: per(turns, records.length),
    entrants: tallies.map((t, index) => ({
      id: entrantIds[index] ?? String(index),
      seatsPlayed: t.seats,
      winRate: per(t.wins, t.seats),
      avgPlacementPoints: per(t.placement, t.seats),
      avgHandPoints: per(t.hand, t.seats),
      knocks: t.knocks,
      knockSuccessRate: t.knocks === 0 ? null : t.knockWins / t.knocks,
    })),
  };
}
