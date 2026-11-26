import {
  estimateHand,
  expectedUnknownValue,
  playRound,
  rankProbability,
  seatFromProfile,
  type BotProfile,
  type Seat,
} from '@blanko/bots';
import {
  applyAction,
  cardOf,
  createRng,
  getPlayerView,
  handPoints,
  legalActions,
  MAX_PLAYERS,
  MIN_PLAYERS,
  rankPoints,
  scoreRound,
  startRound,
  type Action,
  type GameState,
  type PlayerView,
  type Rng,
} from '@blanko/engine';
import { addTo, type Tally } from './tally.ts';

/** Gesammelte Antworten auf die Strategiefragen; Schlüssel sind lesbare Zellen der Berichtstabellen. */
export interface Analysis {
  readonly rounds: number;
  /** Klopfen jetzt minus Ziehen; Schlüssel `Spieler|Schätzung|Fortschritt`. */
  readonly knock: Map<string, Tally>;
  /**
   * Zufälliger 10-Tausch minus der Tausch nach Faustregeln (die Wirkung ist Pflicht);
   * Schlüssel `eigene Karte|Zielkarte|Ziel führt`.
   */
  readonly swap: Map<string, Tally>;
  /** Ablegen auf Verdacht minus normale Wahl; Schlüssel Trefferwahrscheinlichkeit. */
  readonly suspicion: Map<string, Tally>;
  /** Paare in Endhänden; Schlüssel `mit Paar` / `ohne Paar` bzw. `gesparte Punkte`. */
  readonly pairs: Map<string, Tally>;
}

/** Nur jeder vierte Entscheidungspunkt wird nachgespielt; das genügt und halbiert die Laufzeit mehrfach. */
const SAMPLE_RATE = 0.25;
const PLAYOUT_TURN_LIMIT = 300;

/** Spielt eine Alternative mit festem Seed zu Ende und liefert die Platzierungspunkte des Spielers. */
function playout(
  state: GameState,
  action: Action,
  player: number,
  seats: readonly Seat[],
  seed: number,
): number {
  const rng = createRng(seed);
  const after = applyAction(state, action, rng).state;
  const final =
    after.phase.kind === 'roundOver' ? after : playRound(after, seats, rng, PLAYOUT_TURN_LIMIT);
  return scoreRound(final, rng).placementPoints[player] ?? 0;
}

/** Zwei Alternativen unter denselben Zufallszahlen: Differenz der Platzierungspunkte. */
function compare(state: GameState, a: Action, b: Action, seats: readonly Seat[], rng: Rng): number {
  const seed = rng.nextInt(2 ** 31);
  return (
    playout(state, a, state.current, seats, seed) - playout(state, b, state.current, seats, seed)
  );
}

const estimateBucket = (estimate: number): string =>
  estimate >= 20
    ? '20+'
    : `${String(Math.floor(estimate / 2) * 2)}–${String(Math.floor(estimate / 2) * 2 + 1)}`;

function progressBucket(view: PlayerView): string {
  const tableRounds = Math.floor(view.turnCount / view.playerCount);
  if (tableRounds === 0) return '1. Tischrunde';
  if (tableRounds <= 2) return '2.–3.';
  if (tableRounds <= 5) return '4.–6.';
  return '7.+';
}

function cardBucket(points: number): string {
  if (points <= 3) return '1–3';
  if (points <= 6) return '4–6';
  if (points <= 9) return '7–9';
  return '10';
}

function slotBucket(view: PlayerView, player: number, slot: number): string {
  const seen = view.hands[player]?.[slot];
  return seen?.kind === 'known' ? cardBucket(rankPoints(seen.card.rank)) : 'verdeckt';
}

/**
 * Klopfen gegen Ziehen, an jedem Zeitpunkt, an dem beides erlaubt ist – auch dort, wo der Bot
 * selbst klopfen würde. Nur die Fälle ohne Bot-Klopfen zu nehmen hätte genau die Lagen mit gutem
 * Blatt aussortiert, in denen Klopfen sich lohnt.
 */
function analyzeKnock(
  state: GameState,
  view: PlayerView,
  seats: readonly Seat[],
  rng: Rng,
  out: Analysis,
): void {
  const legal = legalActions(state);
  if (!legal.some((a) => a.type === 'knock') || !legal.some((a) => a.type === 'draw')) return;
  const estimate = estimateHand(view.hands[view.viewer] ?? [], expectedUnknownValue(view));
  const key = `${String(view.playerCount)}|${estimateBucket(estimate)}|${progressBucket(view)}`;
  addTo(out.knock, key, compare(state, { type: 'knock' }, { type: 'draw' }, seats, rng));
}

function analyzeSwap(
  state: GameState,
  view: PlayerView,
  ruleChoice: Action,
  seats: readonly Seat[],
  rng: Rng,
  out: Analysis,
): void {
  const swaps = legalActions(state).filter(
    (a): a is Extract<Action, { type: 'blindSwap' }> => a.type === 'blindSwap',
  );
  const swap = swaps[rng.nextInt(Math.max(1, swaps.length))];
  if (swap === undefined) return;
  const unknownValue = expectedUnknownValue(view);
  const opponents = view.hands.map((hand, p) =>
    p === view.viewer ? Infinity : estimateHand(hand, unknownValue),
  );
  const leader =
    opponents.indexOf(Math.min(...opponents)) === swap.target ? 'Ziel führt' : 'Ziel führt nicht';
  const key = `${slotBucket(view, view.viewer, swap.slot)}|${slotBucket(view, swap.target, swap.targetSlot)}|${leader}`;
  addTo(out.swap, key, compare(state, swap, ruleChoice, seats, rng));
}

function analyzeSuspicion(
  state: GameState,
  view: PlayerView,
  ruleChoice: Action,
  seats: readonly Seat[],
  rng: Rng,
  out: Analysis,
): void {
  if (view.matchableRank === null || ruleChoice.type === 'matchDiscard') return;
  const hiddenSlot = (view.hands[view.viewer] ?? []).findIndex((slot) => slot.kind === 'hidden');
  if (hiddenSlot === -1) return;
  const p = rankProbability(view, view.matchableRank);
  const key = p < 0.05 ? 'unter 5 %' : p < 0.1 ? '5–10 %' : p < 0.2 ? '10–20 %' : '20 % und mehr';
  addTo(
    out.suspicion,
    key,
    compare(state, { type: 'matchDiscard', slot: hiddenSlot }, ruleChoice, seats, rng),
  );
}

function analyzePairs(final: GameState, out: Analysis): void {
  const placement = scoreRound(final, createRng(0)).placementPoints;
  final.hands.forEach((hand, player) => {
    const cards = hand.filter((c): c is number => c !== null);
    const raw = cards.reduce((sum, id) => sum + rankPoints(cardOf(id).rank), 0);
    const saved = raw - handPoints(hand);
    addTo(out.pairs, 'gesparte Punkte je Hand', saved);
    addTo(
      out.pairs,
      saved > 0 ? 'mit Paar: Platzierung' : 'ohne Paar: Platzierung',
      placement[player] ?? 0,
    );
  });
}

/**
 * Spielt Runden mit dem gegebenen Profil auf allen Plätzen und vergleicht an zufällig gewählten
 * Entscheidungspunkten Alternativen unter gemeinsamen Zufallszahlen (kontrafaktische Partien).
 */
export function analyze(profile: BotProfile, rounds: number, seed: number): Analysis {
  const rng = createRng(seed);
  const out: Analysis = {
    rounds,
    knock: new Map(),
    swap: new Map(),
    suspicion: new Map(),
    pairs: new Map(),
  };
  const seat = seatFromProfile(profile);
  for (let round = 0; round < rounds; round++) {
    const playerCount = MIN_PLAYERS + (round % (MAX_PLAYERS - MIN_PLAYERS + 1));
    const seats = Array.from({ length: playerCount }, () => seat);
    let state = startRound({ playerCount, dealer: rng.nextInt(playerCount) }, rng);
    while (state.phase.kind !== 'roundOver' && state.turnCount < PLAYOUT_TURN_LIMIT) {
      const view = getPlayerView(state, state.current);
      const ruleChoice = seat.bot.chooseAction(view, legalActions(state), rng);
      if (rng.next() < SAMPLE_RATE) {
        if (view.phase === 'turnStart') {
          analyzeKnock(state, view, seats, rng, out);
          analyzeSuspicion(state, view, ruleChoice, seats, rng, out);
        } else if (view.phase === 'special' && view.specialRank === 10) {
          analyzeSwap(state, view, ruleChoice, seats, rng, out);
        }
      }
      state = applyAction(state, ruleChoice, rng).state;
    }
    analyzePairs(state, out);
  }
  return out;
}
