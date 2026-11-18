import type { RuleParams } from '@blanko/bots';
import type { Rng } from '@blanko/engine';

/** Suchbereich je Parameter. Bewusst weit, aber innerhalb dessen, was im Spiel Sinn ergibt. */
interface Range {
  readonly min: number;
  readonly max: number;
}

const RANGES = {
  keepMargin: { min: -2, max: 5 },
  knockThreshold: { min: 0, max: 20 },
  knockLead: { min: -5, max: 12 },
  knockProgress: { min: 0, max: 4 },
  // Über 1 heißt „nie nach Wahrscheinlichkeit klopfen“.
  knockWinProbability: { min: 0.2, max: 1.1 },
  opponentLowBias: { min: 0, max: 0.6 },
  peekOwnValue: { min: 0, max: 6 },
  peekOpponentValue: { min: 0, max: 4 },
  swapMargin: { min: 0, max: 8 },
  // Über 1 heißt „nie auf Verdacht ablegen“; die Obergrenze lässt diese Möglichkeit offen.
  suspicionThreshold: { min: 0, max: 1.2 },
} as const satisfies Record<string, Range>;

/**
 * Mutationen sind bewusst klein und betreffen nur einen Teil der Parameter: Im ersten Lauf mit
 * 12 % auf allen Parametern war fast jeder Kandidat schlechter als sein Ausgangspunkt.
 */
const MUTATION_SCALE = 0.06;
const MUTATION_PROBABILITY = 1 / 3;

const round2 = (value: number): number => Math.round(value * 100) / 100;
const clamp = (value: number, range: Range): number =>
  round2(Math.min(range.max, Math.max(range.min, value)));
const uniform = (range: Range, rng: Rng): number =>
  clamp(range.min + rng.next() * (range.max - range.min), range);

/** Standardnormalverteilte Zufallszahl (Box-Muller). */
function gaussian(rng: Rng): number {
  const u = 1 - rng.next();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng.next());
}

const nudge = (value: number, range: Range, rng: Rng): number =>
  rng.next() < MUTATION_PROBABILITY
    ? clamp(value + gaussian(rng) * MUTATION_SCALE * (range.max - range.min), range)
    : value;

/** Gleichverteilt zufällige Parameter (Zufallssuche). */
export function randomParams(rng: Rng, thresholdCount: number): RuleParams {
  return {
    keepMargin: uniform(RANGES.keepMargin, rng),
    knockThresholds: Array.from({ length: thresholdCount }, () =>
      uniform(RANGES.knockThreshold, rng),
    ),
    knockLead: uniform(RANGES.knockLead, rng),
    knockProgress: uniform(RANGES.knockProgress, rng),
    knockWinProbability: uniform(RANGES.knockWinProbability, rng),
    opponentLowBias: uniform(RANGES.opponentLowBias, rng),
    peekOwnValue: uniform(RANGES.peekOwnValue, rng),
    peekOpponentValue: uniform(RANGES.peekOpponentValue, rng),
    swapMargin: uniform(RANGES.swapMargin, rng),
    suspicionThreshold: uniform(RANGES.suspicionThreshold, rng),
  };
}

/** Kleine zufällige Verschiebung aller Parameter (Evolution). */
export function mutateParams(params: RuleParams, rng: Rng): RuleParams {
  return {
    keepMargin: nudge(params.keepMargin, RANGES.keepMargin, rng),
    knockThresholds: params.knockThresholds.map((t) => nudge(t, RANGES.knockThreshold, rng)),
    knockLead: nudge(params.knockLead, RANGES.knockLead, rng),
    knockProgress: nudge(params.knockProgress, RANGES.knockProgress, rng),
    knockWinProbability: nudge(params.knockWinProbability, RANGES.knockWinProbability, rng),
    opponentLowBias: nudge(params.opponentLowBias, RANGES.opponentLowBias, rng),
    peekOwnValue: nudge(params.peekOwnValue, RANGES.peekOwnValue, rng),
    peekOpponentValue: nudge(params.peekOpponentValue, RANGES.peekOpponentValue, rng),
    swapMargin: nudge(params.swapMargin, RANGES.swapMargin, rng),
    suspicionThreshold: nudge(params.suspicionThreshold, RANGES.suspicionThreshold, rng),
  };
}
