/** Mittelwert mit Standardfehler, schrittweise gesammelt. */
export interface Tally {
  n: number;
  sum: number;
  sumOfSquares: number;
}

export function addTo(tallies: Map<string, Tally>, key: string, value: number): void {
  const tally = tallies.get(key) ?? { n: 0, sum: 0, sumOfSquares: 0 };
  tally.n++;
  tally.sum += value;
  tally.sumOfSquares += value * value;
  tallies.set(key, tally);
}

export function meanOf(tally: Tally): number {
  return tally.n === 0 ? 0 : tally.sum / tally.n;
}

export function standardErrorOf(tally: Tally): number {
  if (tally.n < 2) return Infinity;
  const mean = meanOf(tally);
  const variance = Math.max(0, (tally.sumOfSquares - tally.n * mean * mean) / (tally.n - 1));
  return Math.sqrt(variance / tally.n);
}
