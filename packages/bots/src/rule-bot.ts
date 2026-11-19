import {
  MIN_PLAYERS,
  type Action,
  type PlayerView,
  type Rank,
  type Rng,
  type SlotView,
} from '@blanko/engine';
import { pickRandom, type Bot } from './bot.ts';
import {
  estimateHand,
  expectedUnknownValue,
  rankProbability,
  soleLowestProbability,
} from './estimate.ts';

/** Faustregeln des RuleBots. Alle Werte in Handpunkten, sofern nicht anders angegeben. */
export interface RuleParams {
  /** Mindestverbesserung der geschätzten Hand, damit eine gezogene Karte behalten wird. */
  readonly keepMargin: number;
  /** Klopf-Grenze je Spielerzahl, Index 0 für 2 Spieler bis Index 4 für 6 Spieler. */
  readonly knockThresholds: readonly number[];
  /** Geforderter Vorsprung vor dem geschätzt besten Gegner, bevor geklopft wird. */
  readonly knockLead: number;
  /** Um so viele Punkte steigt die Klopf-Grenze pro vollständiger Tischrunde. */
  readonly knockProgress: number;
  /**
   * Zusätzlich klopfen, sobald die geschätzte Wahrscheinlichkeit, allein die niedrigste Hand zu
   * haben, mindestens so hoch ist; über 1 heißt nie.
   */
  readonly knockWinProbability: number;
  /** Wie stark verdeckte Gegnerkarten bei dieser Schätzung als niedrig angenommen werden (0 = gleichverteilt). */
  readonly opponentLowBias: number;
  /** Wie viel ein Blick per 8 auf eine eigene unbekannte Karte wert ist. */
  readonly peekOwnValue: number;
  /** Wie viel ein Blick per 9 auf eine unbekannte Gegnerkarte wert ist. */
  readonly peekOpponentValue: number;
  /** Mindestgewinn eines 10-Tauschs. */
  readonly swapMargin: number;
  /** Mindestwahrscheinlichkeit (0 bis 1), um eine unbekannte Karte auf Verdacht abzulegen; über 1 heißt nie. */
  readonly suspicionThreshold: number;
}

/** Was der Bot für seine Entscheidungen aus der Sicht ableitet. */
interface Situation {
  readonly view: PlayerView;
  readonly ownHand: readonly SlotView[];
  readonly unknownValue: number;
  readonly ownEstimate: number;
}

function situationOf(view: PlayerView): Situation {
  const ownHand = view.hands[view.viewer] ?? [];
  const unknownValue = expectedUnknownValue(view);
  return { view, ownHand, unknownValue, ownEstimate: estimateHand(ownHand, unknownValue) };
}

function withSlot(hand: readonly SlotView[], slot: number, replacement: SlotView): SlotView[] {
  return hand.map((current, index) => (index === slot ? replacement : current));
}

function isHidden(view: PlayerView, player: number, slot: number): boolean {
  return view.hands[player]?.[slot]?.kind === 'hidden';
}

/**
 * Bewertung einer Sonderaktion nach dem Ablegen einer 8, 9 oder 10; null heißt „nicht sinnvoll“.
 * `hand` ist die eigene Hand, auf die sich die Aktion bezieht.
 */
function scoreSpecialAction(
  s: Situation,
  hand: readonly SlotView[],
  action: Action,
  params: RuleParams,
): number | null {
  switch (action.type) {
    case 'peekOwn':
      return hand[action.slot]?.kind === 'hidden' ? params.peekOwnValue : null;
    case 'peekOpponent':
      return isHidden(s.view, action.target, action.targetSlot) ? params.peekOpponentValue : null;
    case 'blindSwap': {
      const theirs = s.view.hands[action.target]?.[action.targetSlot];
      if (theirs === undefined) return null;
      const before = estimateHand(hand, s.unknownValue);
      const gain = before - estimateHand(withSlot(hand, action.slot, theirs), s.unknownValue);
      return gain >= params.swapMargin ? gain : null;
    }
    default:
      return null;
  }
}

/** Möglichen Sonderaktionen nach dem Ablegen einer Karte dieses Rangs, bezogen auf `hand`. */
function possibleSpecials(s: Situation, hand: readonly SlotView[], rank: Rank): Action[] {
  const own = hand.flatMap((slot, index) => (slot.kind === 'empty' ? [] : [index]));
  const opponents = s.view.hands.flatMap((theirs, target) =>
    target === s.view.viewer || (rank === 10 && target === s.view.knocker)
      ? []
      : theirs.flatMap((slot, targetSlot) =>
          slot.kind === 'empty' ? [] : [{ target, targetSlot }],
        ),
  );
  if (rank === 8) return own.map((slot): Action => ({ type: 'peekOwn', slot }));
  if (rank === 9) return opponents.map((t): Action => ({ type: 'peekOpponent', ...t }));
  if (rank === 10)
    return own.flatMap((slot) => opponents.map((t): Action => ({ type: 'blindSwap', slot, ...t })));
  return [];
}

/** Was es wert ist, nach dem Ablegen einer Karte dieses Rangs die Sonderfunktion nutzen zu dürfen. */
function specialValue(
  s: Situation,
  hand: readonly SlotView[],
  rank: Rank,
  params: RuleParams,
): number {
  let best = 0;
  for (const action of possibleSpecials(s, hand, rank)) {
    best = Math.max(best, scoreSpecialAction(s, hand, action, params) ?? 0);
  }
  return best;
}

/**
 * Nach dem Ziehen: ablegen oder behalten. Seit der Hausregel-Änderung wirkt auch eine 8, 9 oder 10,
 * die beim Behalten aus der Hand abgelegt wird; ihr Wert zählt deshalb mit.
 */
function scoreDrawnAction(s: Situation, action: Action, params: RuleParams): number | null {
  const drawn = s.view.drawnCard;
  if (drawn === null) return null;
  if (action.type === 'discardDrawn') return specialValue(s, s.ownHand, drawn.rank, params);
  if (action.type !== 'keep') return null;
  const handAfter = withSlot(s.ownHand, action.slot, { kind: 'known', card: drawn });
  const gain = s.ownEstimate - estimateHand(handAfter, s.unknownValue);
  if (gain < params.keepMargin) return null;
  const replaced = s.ownHand[action.slot];
  return (
    gain + (replaced?.kind === 'known' ? specialValue(s, handAfter, replaced.card.rank, params) : 0)
  );
}

/**
 * Bei gleich großem Nutzen trifft eine 9 oder 10 lieber den Gegner, der am besten dasteht: Ihm
 * eine hohe Karte unterzuschieben oder in die Karten zu schauen, bringt am meisten. Das Gewicht ist
 * so klein, dass es nur zwischen sonst gleich guten Zielen entscheidet.
 */
const LEADER_PREFERENCE = 1e-3;

function leaderBonus(s: Situation, action: Action): number {
  if (action.type !== 'peekOpponent' && action.type !== 'blindSwap') return 0;
  const target = s.view.hands[action.target] ?? [];
  return -LEADER_PREFERENCE * estimateHand(target, s.unknownValue);
}

/**
 * Bestbewertete Aktion über `fallback` (Bewertung 0); echte Gleichstände entscheidet der Zufall.
 * Vorher gewann die erste in der Liste, und weil die Liste nach Spielernummer sortiert ist, traf jeder
 * 10-Tausch bei verdeckten Karten Spieler 0 – im Labor kostete das Sitz 0 bei 6 Spielern 0,19
 * Platzierungspunkte.
 */
function chooseBest(
  s: Situation,
  legal: readonly Action[],
  fallback: Action,
  score: (action: Action) => number | null,
  rng: Rng,
): Action {
  let best: Action[] = [fallback];
  let bestScore = score(fallback) ?? 0;
  for (const action of legal) {
    const raw = action.type === fallback.type ? null : score(action);
    if (raw === null) continue;
    const value = raw + leaderBonus(s, action);
    if (value > bestScore) {
      best = [action];
      bestScore = value;
    } else if (value === bestScore) {
      best.push(action);
    }
  }
  return pickRandom(best, rng);
}

/** Eine bekannte passende Karte wird immer abgelegt, eine unbekannte nur ab der Verdachtsgrenze. */
function chooseMatch(s: Situation, legal: readonly Action[], params: RuleParams): Action | null {
  const rank = s.view.matchableRank;
  if (rank === null) return null;
  const matches = legal.filter(
    (a): a is Extract<Action, { type: 'matchDiscard' }> => a.type === 'matchDiscard',
  );
  const sure = matches.find((a) => {
    const slot = s.ownHand[a.slot];
    return slot?.kind === 'known' && slot.card.rank === rank;
  });
  if (sure !== undefined) return sure;
  if (rankProbability(s.view, rank) < params.suspicionThreshold) return null;
  return matches.find((a) => isHidden(s.view, s.view.viewer, a.slot)) ?? null;
}

function bestOpponentEstimate(s: Situation): number {
  const estimates = s.view.hands
    .filter((_, player) => player !== s.view.viewer)
    .map((hand) => estimateHand(hand, s.unknownValue));
  return Math.min(...estimates);
}

/** Stichproben für die Gewinnwahrscheinlichkeit: genug für ±0,1, billig genug für das Labor. */
const KNOCK_SAMPLES = 32;

function shouldKnock(s: Situation, params: RuleParams, rng: Rng): boolean {
  const base = params.knockThresholds[s.view.playerCount - MIN_PLAYERS] ?? -Infinity;
  const tableRounds = Math.floor(s.view.turnCount / s.view.playerCount);
  const threshold = base + params.knockProgress * tableRounds;
  if (s.ownEstimate <= threshold && s.ownEstimate + params.knockLead <= bestOpponentEstimate(s)) {
    return true;
  }
  return (
    params.knockWinProbability <= 1 &&
    soleLowestProbability(s.view, KNOCK_SAMPLES, params.opponentLowBias, rng) >=
      params.knockWinProbability
  );
}

function chooseAtTurnStart(
  s: Situation,
  legal: readonly Action[],
  params: RuleParams,
  rng: Rng,
): Action {
  const match = chooseMatch(s, legal, params);
  if (match !== null) return match;
  const knock = legal.find((a) => a.type === 'knock');
  if (knock !== undefined && shouldKnock(s, params, rng)) return knock;
  return legal.find((a) => a.type === 'draw') ?? knock ?? firstLegal(legal);
}

function firstLegal(legal: readonly Action[]): Action {
  const first = legal[0];
  if (first === undefined) throw new Error('Keine erlaubte Aktion');
  return first;
}

/**
 * Ein Fehler ist ein plausibler Fehlgriff: falsch behalten, falsch abgelegt, Sonderkarte ungünstig
 * genutzt. Klopfen und Ablegen auf Verdacht sind ausgenommen. Zufälliges Klopfen entschiede die Runde
 * sofort, und weil es bis zu vier Verdachtsablagen gibt, wäre sonst fast jeder Fehler eine
 * Strafkarte gewesen; schwache Stufen sammelten so im Schnitt über 50 Handpunkte.
 */
function chooseMistake(legal: readonly Action[], rng: Rng): Action {
  const candidates = legal.filter((a) => a.type !== 'knock' && a.type !== 'matchDiscard');
  return pickRandom(candidates.length > 0 ? candidates : legal, rng);
}

export function createRuleBot(params: RuleParams, mistakeRate: number): Bot {
  return {
    chooseAction(view, legal, rng) {
      if (mistakeRate > 0 && rng.next() < mistakeRate) {
        return chooseMistake(legal, rng);
      }
      const s = situationOf(view);
      switch (view.phase) {
        case 'drawn':
          return chooseBest(
            s,
            legal,
            { type: 'discardDrawn' },
            (a) => scoreDrawnAction(s, a, params),
            rng,
          );
        case 'special':
          return chooseBest(
            s,
            legal,
            { type: 'skipSpecial' },
            (a) => scoreSpecialAction(s, s.ownHand, a, params),
            rng,
          );
        default:
          return chooseAtTurnStart(s, legal, params, rng);
      }
    },
  };
}
