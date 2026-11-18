import { shuffle, type Rng } from '@blanko/engine';

/**
 * Wer an welchem Platz sitzt, als Index in die Teilnehmerliste.
 * `fixed`: immer dieselbe Besetzung (simulate). `rotating`: jede Runde neu gelost (tournament).
 */
export type SeatPlan =
  | { readonly kind: 'fixed'; readonly seats: readonly number[] }
  | { readonly kind: 'rotating'; readonly entrantCount: number; readonly playerCount: number };

export function seatsForRound(plan: SeatPlan, rng: Rng): readonly number[] {
  if (plan.kind === 'fixed') return plan.seats;
  const pool = Array.from({ length: plan.entrantCount }, (_, i) => i);
  if (plan.entrantCount >= plan.playerCount) {
    return shuffle(pool, rng).slice(0, plan.playerCount);
  }
  // Weniger Teilnehmer als Plätze: Jeder sitzt mindestens einmal, der Rest wird zufällig aufgefüllt.
  const extra = Array.from({ length: plan.playerCount - plan.entrantCount }, () =>
    rng.nextInt(plan.entrantCount),
  );
  return shuffle([...pool, ...extra], rng);
}

export function playerCountOf(plan: SeatPlan): number {
  return plan.kind === 'fixed' ? plan.seats.length : plan.playerCount;
}
