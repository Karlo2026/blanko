import type { BotProfile, RuleParams } from '@blanko/bots';
import { createRng, MAX_PLAYERS, MIN_PLAYERS, type Rng } from '@blanko/engine';
import type { Entrant } from './entrant.ts';
import { measureChallenger, type Fitness } from './fitness.ts';
import { mutateParams, randomParams } from './param-space.ts';

export type TuneMethod = 'random' | 'evolve';

export interface TuneOptions {
  readonly method: TuneMethod;
  readonly generations: number;
  /** Kandidaten pro Generation. */
  readonly candidates: number;
  /** Runden pro Kandidatenbewertung. */
  readonly games: number;
  readonly seed: number;
  readonly workers: number;
}

interface GenerationLog {
  readonly generation: number;
  readonly bestScreening: Fitness;
  readonly confirmation: Fitness;
  readonly accepted: boolean;
}

export interface TuneResult {
  readonly start: BotProfile;
  readonly tuned: BotProfile;
  readonly history: readonly GenerationLog[];
}

/** Ein neuer Champion muss sich auf frischen Seeds um mehr als so viele Standardfehler bestätigen. */
const SIGNIFICANCE = 2;

const entrantFor = (profile: BotProfile): Entrant => ({ kind: 'profile', id: profile.id, profile });
const withRule = (profile: BotProfile, rule: RuleParams): BotProfile => ({
  ...profile,
  rule,
  rating: null,
});

function propose(method: TuneMethod, champion: RuleParams, rng: Rng): RuleParams {
  return method === 'random'
    ? randomParams(rng, MAX_PLAYERS - MIN_PLAYERS + 1)
    : mutateParams(champion, rng);
}

/**
 * Sucht per Selbstspiel bessere Faustregeln. Jede Generation treten Herausforderer auf denselben
 * Seeds gegen den Champion an (Vorauswahl). Der Beste wird auf frischen Seeds erneut gemessen und
 * nur bei signifikantem Vorsprung neuer Champion. So setzt sich kein Kandidat durch, der nur Glück
 * in der Vorauswahl hatte.
 */
export async function tune(start: BotProfile, options: TuneOptions): Promise<TuneResult> {
  const rng = createRng(options.seed);
  let champion = start;
  const history: GenerationLog[] = [];
  for (let generation = 1; generation <= options.generations; generation++) {
    const screeningSeed = rng.nextInt(2 ** 30);
    const challengers = Array.from({ length: options.candidates }, (_, i) =>
      withRule(
        { ...champion, id: `kandidat-${String(generation)}-${String(i)}` },
        propose(options.method, champion.rule, rng),
      ),
    );
    let best = challengers[0] ?? champion;
    let bestScreening: Fitness = { mean: -Infinity, standardError: 0 };
    for (const challenger of challengers) {
      const fitness = await measureChallenger(
        entrantFor(challenger),
        entrantFor(champion),
        options.games,
        screeningSeed,
        options.workers,
      );
      if (fitness.mean > bestScreening.mean) {
        best = challenger;
        bestScreening = fitness;
      }
    }
    const confirmation = await measureChallenger(
      entrantFor(best),
      entrantFor(champion),
      options.games * 2,
      rng.nextInt(2 ** 30),
      options.workers,
    );
    const accepted = confirmation.mean > SIGNIFICANCE * confirmation.standardError;
    if (accepted) champion = { ...best, id: start.id };
    history.push({ generation, bestScreening, confirmation, accepted });
  }
  return {
    start,
    tuned: { ...champion, id: `${start.id}-getunt`, name: `${start.name} (getunt)` },
    history,
  };
}
