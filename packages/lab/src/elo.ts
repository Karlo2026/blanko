import type { RoundRecord } from './chunk.ts';

const ELO_SCALE = 400;
const ELO_MEAN = 1500;
/** Virtuelle halbe Siege je Paarung halten Wertungen endlich, auch wenn jemand nie verliert. */
const PRIOR_WINS = 0.5;
const MAX_ITERATIONS = 10_000;
const TOLERANCE = 1e-10;

/**
 * Paarweise Vergleiche: In jeder Runde schlägt jeder Platz alle schlechter platzierten.
 * wins[a][b] zählt, wie oft Teilnehmer a vor Teilnehmer b lag.
 */
export function pairwiseWins(records: readonly RoundRecord[], entrantCount: number): number[][] {
  const wins = Array.from({ length: entrantCount }, () => new Array<number>(entrantCount).fill(0));
  for (const record of records) {
    const order = record.ranking.map((seat) => record.seats[seat] ?? -1);
    order.forEach((winner, place) => {
      for (const loser of order.slice(place + 1)) {
        const row = wins[winner];
        if (row !== undefined && winner !== loser) row[loser] = (row[loser] ?? 0) + 1;
      }
    });
  }
  return wins;
}

const cell = (matrix: readonly (readonly number[])[], a: number, b: number): number =>
  matrix[a]?.[b] ?? 0;

/**
 * Elo-Wertung als Bradley-Terry-Schätzung (MM-Verfahren nach Hunter 2004).
 * Anders als fortlaufendes Elo hängt sie nicht von der Reihenfolge der Runden ab und ist damit
 * bei gleichem Seed exakt reproduzierbar. 400 Punkte Abstand ≙ 10:1 Gewinnchance im Zweikampf.
 */
export function fitElo(wins: readonly (readonly number[])[]): number[] {
  const n = wins.length;
  const w = (a: number, b: number): number => (a === b ? 0 : cell(wins, a, b) + PRIOR_WINS);
  let strength = new Array<number>(n).fill(1);
  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const next = strength.map((own, a) => {
      let totalWins = 0;
      let denominator = 0;
      for (let b = 0; b < n; b++) {
        if (a === b) continue;
        totalWins += w(a, b);
        denominator += (w(a, b) + w(b, a)) / (own + (strength[b] ?? 1));
      }
      return totalWins / denominator;
    });
    const logMean = next.reduce((sum, s) => sum + Math.log(s), 0) / n;
    const normalized = next.map((s) => s / Math.exp(logMean));
    const change = Math.max(...normalized.map((s, i) => Math.abs(s - (strength[i] ?? 1))));
    strength = normalized;
    if (change < TOLERANCE) break;
  }
  return strength.map((s) => ELO_MEAN + ELO_SCALE * Math.log10(s));
}
