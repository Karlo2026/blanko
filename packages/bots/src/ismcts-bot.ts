import {
  actionKey,
  applyAction,
  createRng,
  determinize,
  scoreRound,
  type Action,
  type GameState,
  type PlayerView,
  type Rng,
} from '@blanko/engine';
import { pickRandom, type Bot } from './bot.ts';
import { createRuleBot, type RuleParams } from './rule-bot.ts';
import { playRound, type Seat } from './runner.ts';

export interface IsmctsParams {
  /** Höchstzahl der Determinisierungen pro Entscheidung. */
  readonly iterations: number;
  /** Zeitbudget pro Entscheidung in Millisekunden; null heißt nur Iterationen (reproduzierbar). */
  readonly timeBudgetMs: number | null;
  /** Faustregeln, nach denen in den Rollouts alle Spieler ziehen. */
  readonly rollout: RuleParams;
}

/**
 * Rollouts enden spätestens nach so vielen Zügen und werden dann nach Stand gewertet. Echte Runden
 * dauern meist 20 bis 40 Züge; in Determinisierungen können Bots sich sonst endlos im Kreis drehen.
 */
const ROLLOUT_TURN_LIMIT = 100;

/**
 * Annahme in den Determinisierungen: Gegner kennen alle ihre eigenen Karten. Im Labor gemessen
 * (Phase 5) war das mindestens so gut wie 0 % oder 50 % und ist am einfachsten zu erklären.
 */
const OPPONENT_SELF_KNOWLEDGE = 1;

const SPECIAL_TYPES: ReadonlySet<Action['type']> = new Set([
  'peekOwn',
  'peekOpponent',
  'blindSwap',
]);

/**
 * Welche Aktionen verglichen werden: alle gewöhnlichen, von den Sonderaktionen nur die Wahl der
 * Faustregeln. Bei einer 10 gäbe es sonst bis zu 60 Tauschvarianten, die das Budget aufzehren.
 */
function candidatesOf(legal: readonly Action[], ruleChoice: Action): Action[] {
  const ruleKey = actionKey(ruleChoice);
  return [
    ruleChoice,
    ...legal.filter((a) => !SPECIAL_TYPES.has(a.type) && actionKey(a) !== ruleKey),
  ];
}

function rollout(
  guess: GameState,
  action: Action,
  viewer: number,
  seats: readonly Seat[],
  seed: number,
): number {
  const rng = createRng(seed);
  const after = applyAction(guess, action, rng).state;
  const final =
    after.phase.kind === 'roundOver' ? after : playRound(after, seats, rng, ROLLOUT_TURN_LIMIT);
  return scoreRound(final, rng).placementPoints[viewer] ?? 0;
}

/** Gepaarte Differenzen eines Kandidaten zur Wahl der Faustregeln über alle Determinisierungen. */
interface PairedStats {
  sum: number;
  sumOfSquares: number;
}

/**
 * Ein Kandidat ersetzt die Wahl der Faustregeln nur, wenn sein Vorsprung mehr als so viele
 * Standardfehler beträgt. Ohne diese Hürde gewinnt bei vielen verrauschten Kandidaten fast immer
 * einer zufällig („Fluch des Gewinners“), und der Bot weicht ohne echten Vorteil ab.
 */
const SIGNIFICANCE = 2;

/** Bewertet alle Kandidaten; Index 0 ist die Wahl der Faustregeln, an der alle gemessen werden. */
function evaluate(
  view: PlayerView,
  candidates: readonly Action[],
  params: IsmctsParams,
  seats: readonly Seat[],
  rng: Rng,
): { stats: PairedStats[]; samples: number } {
  const stats: PairedStats[] = candidates.map(() => ({ sum: 0, sumOfSquares: 0 }));
  const deadline = params.timeBudgetMs === null ? Infinity : Date.now() + params.timeBudgetMs;
  let samples = 0;
  for (; samples < params.iterations && Date.now() < deadline; samples++) {
    // Gemeinsame Zufallszahlen: Alle Kandidaten treffen auf dieselbe Kartenverteilung und denselben
    // weiteren Spielverlauf. So bleibt vom Rauschen vor allem der Unterschied zwischen den Aktionen.
    const guess = determinize(view, rng, OPPONENT_SELF_KNOWLEDGE);
    const seed = rng.nextInt(2 ** 31);
    const rewards = candidates.map((action) => rollout(guess, action, view.viewer, seats, seed));
    const baseline = rewards[0] ?? 0;
    rewards.forEach((reward, index) => {
      const stat = stats[index];
      if (stat === undefined) return;
      stat.sum += reward - baseline;
      stat.sumOfSquares += (reward - baseline) ** 2;
    });
  }
  return { stats, samples };
}

/** Bester Kandidat, dessen Vorsprung vor den Faustregeln signifikant ist; sonst 0. */
function significantBest(stats: readonly PairedStats[], samples: number): number {
  if (samples < 2) return 0;
  let best = 0;
  let bestMean = 0;
  stats.forEach((stat, index) => {
    const mean = stat.sum / samples;
    const variance = Math.max(0, (stat.sumOfSquares - samples * mean * mean) / (samples - 1));
    const standardError = Math.sqrt(variance / samples);
    if (mean > bestMean && mean > SIGNIFICANCE * standardError) {
      best = index;
      bestMean = mean;
    }
  });
  return best;
}

/**
 * Information Set Monte Carlo, flach an der Wurzel: Vor jedem Zug werden viele Determinisierungen
 * erzeugt, die die unbekannten Karten passend zum eigenen Wissen verteilen. Jede eigene
 * Kandidatenaktion wird darin mit Faustregeln bis zum Rundenende gespielt und nach
 * Platzierungspunkten bewertet. Spätere Entscheidungen übernimmt der Rollout; da jeder Zug neu
 * sucht, ist kein tieferer Baum nötig.
 */
export function createIsmctsBot(params: IsmctsParams, mistakeRate: number): Bot {
  const ruleBot = createRuleBot(params.rollout, 0);
  return {
    chooseAction(view, legal, rng) {
      if (mistakeRate > 0 && rng.next() < mistakeRate) {
        const candidates = legal.filter((a) => a.type !== 'knock');
        return pickRandom(candidates.length > 0 ? candidates : legal, rng);
      }
      const ruleChoice = ruleBot.chooseAction(view, legal, rng);
      const candidates = candidatesOf(legal, ruleChoice);
      if (candidates.length === 1) return ruleChoice;

      const seats: Seat[] = Array.from({ length: view.playerCount }, () => ({
        bot: ruleBot,
        forgetRate: 0,
      }));
      const { stats, samples } = evaluate(view, candidates, params, seats, rng);
      return candidates[significantBest(stats, samples)] ?? ruleChoice;
    },
  };
}
