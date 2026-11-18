import { MIN_PLAYERS, type Action, type PlayerView, type Rng, type SlotView } from '@blanko/engine';
import { pickRandom, type Bot } from './bot.ts';
import { estimateHand, expectedUnknownValue, rankProbability } from './estimate.ts';

/** Faustregeln des RuleBots. Alle Werte in Handpunkten, sofern nicht anders angegeben. */
export interface RuleParams {
  /** Mindestverbesserung der geschätzten Hand, damit eine gezogene Karte behalten wird. */
  readonly keepMargin: number;
  /** Klopf-Grenze je Spielerzahl, Index 0 für 2 Spieler bis Index 4 für 6 Spieler. */
  readonly knockThresholds: readonly number[];
  /** Geforderter Vorsprung vor dem geschätzt besten Gegner, bevor geklopft wird. */
  readonly knockLead: number;
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

/** Um wie viele geschätzte Punkte sich die eigene Hand verbessert, wenn ein Platz neu belegt wird. */
function gainOfReplacing(s: Situation, slot: number, replacement: SlotView): number {
  return s.ownEstimate - estimateHand(withSlot(s.ownHand, slot, replacement), s.unknownValue);
}

function isHidden(view: PlayerView, player: number, slot: number): boolean {
  return view.hands[player]?.[slot]?.kind === 'hidden';
}

/** Bewertung einer Aktion nach dem Ziehen; null heißt „nicht sinnvoll“. */
function scoreDrawnAction(s: Situation, action: Action, params: RuleParams): number | null {
  const drawn = s.view.drawnCard;
  switch (action.type) {
    case 'discardDrawn':
      return 0;
    case 'keep': {
      if (drawn === null) return null;
      const gain = gainOfReplacing(s, action.slot, { kind: 'known', card: drawn });
      return gain >= params.keepMargin ? gain : null;
    }
    case 'peekOwn':
      return isHidden(s.view, s.view.viewer, action.slot) ? params.peekOwnValue : null;
    case 'peekOpponent':
      return isHidden(s.view, action.target, action.targetSlot) ? params.peekOpponentValue : null;
    case 'blindSwap': {
      const theirs = s.view.hands[action.target]?.[action.targetSlot];
      if (theirs === undefined) return null;
      const gain = gainOfReplacing(s, action.slot, theirs);
      return gain >= params.swapMargin ? gain : null;
    }
    default:
      return null;
  }
}

function chooseAfterDraw(s: Situation, legal: readonly Action[], params: RuleParams): Action {
  let best: Action = { type: 'discardDrawn' };
  let bestScore = 0;
  for (const action of legal) {
    const score = scoreDrawnAction(s, action, params);
    if (score !== null && score > bestScore) {
      best = action;
      bestScore = score;
    }
  }
  return best;
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

function shouldKnock(s: Situation, params: RuleParams): boolean {
  const threshold = params.knockThresholds[s.view.playerCount - MIN_PLAYERS] ?? -Infinity;
  return s.ownEstimate <= threshold && s.ownEstimate + params.knockLead <= bestOpponentEstimate(s);
}

function chooseAtTurnStart(s: Situation, legal: readonly Action[], params: RuleParams): Action {
  const match = chooseMatch(s, legal, params);
  if (match !== null) return match;
  const knock = legal.find((a) => a.type === 'knock');
  if (knock !== undefined && shouldKnock(s, params)) return knock;
  return legal.find((a) => a.type === 'draw') ?? knock ?? firstLegal(legal);
}

function firstLegal(legal: readonly Action[]): Action {
  const first = legal[0];
  if (first === undefined) throw new Error('Keine erlaubte Aktion');
  return first;
}

/** Ein Fehler ist ein zufälliger Zug; Klopfen bleibt davon ausgenommen, weil es die Runde entscheidet. */
function chooseMistake(legal: readonly Action[], rng: Rng): Action {
  const candidates = legal.filter((a) => a.type !== 'knock');
  return pickRandom(candidates.length > 0 ? candidates : legal, rng);
}

export function createRuleBot(params: RuleParams, mistakeRate: number): Bot {
  return {
    chooseAction(view, legal, rng) {
      if (mistakeRate > 0 && rng.next() < mistakeRate) {
        return chooseMistake(legal, rng);
      }
      const situation = situationOf(view);
      return view.phase === 'drawn'
        ? chooseAfterDraw(situation, legal, params)
        : chooseAtTurnStart(situation, legal, params);
    },
  };
}
