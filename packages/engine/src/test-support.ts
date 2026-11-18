// Hilfen nur für Tests: gezielte Spielsituationen bauen, ohne über Zufall zu gehen.
import type { Action, GameEvent } from './actions.ts';
import { applyAction } from './apply.ts';
import { ALL_CARD_IDS, cardIdOf, cardOf, type CardId, type Rank, type Suit } from './cards.ts';
import { everyoneMask, type Knowledge } from './knowledge.ts';
import { createRng, type Rng } from './rng.ts';
import type { GameState, Phase, PlayerId, Slot } from './state.ts';

export const card = (rank: Rank, suit: Suit = 'clubs'): CardId => cardIdOf(rank, suit);

interface Scenario {
  readonly hands: readonly (readonly Slot[])[];
  readonly current?: PlayerId;
  /** Oberste Karte zuletzt. Ohne Angabe: alle übrigen Karten. */
  readonly drawPile?: readonly CardId[];
  /** Oberste Karte zuletzt. Ohne Angabe: eine übrige Karte. */
  readonly discardPile?: readonly CardId[];
  readonly matchableRank?: Rank | null;
  readonly knocker?: PlayerId | null;
  readonly turnsAfterKnock?: number;
  readonly turnCount?: number;
  readonly phase?: Phase;
}

export function scenario(s: Scenario): GameState {
  const used = new Set<CardId>(
    [...s.hands.flat(), ...(s.drawPile ?? []), ...(s.discardPile ?? [])].filter(
      (c): c is CardId => c !== null,
    ),
  );
  if (s.phase?.kind === 'drawn') {
    used.add(s.phase.card);
  }
  const rest = ALL_CARD_IDS.filter((id) => !used.has(id));
  const discardPile = s.discardPile ?? rest.slice(0, 1);
  const drawPile = s.drawPile ?? rest.filter((id) => !discardPile.includes(id));
  const playerCount = s.hands.length;
  const knowledge: Knowledge = ALL_CARD_IDS.map((id) =>
    discardPile.includes(id) ? everyoneMask(playerCount) : 0,
  );
  return {
    playerCount,
    dealer: ((s.current ?? 0) + playerCount - 1) % playerCount,
    current: s.current ?? 0,
    phase: s.phase ?? { kind: 'turnStart' },
    hands: s.hands,
    drawPile,
    discardPile,
    knowledge,
    matchableRank: s.matchableRank ?? null,
    knocker: s.knocker ?? null,
    turnsAfterKnock: s.turnsAfterKnock ?? 0,
    turnCount: s.turnCount ?? 0,
    canStillPeek: s.hands.map(() => true),
    keptOver: ALL_CARD_IDS.map(() => null),
  };
}

/** Wendet mehrere Aktionen nacheinander an und sammelt alle Ereignisse. */
export function play(
  state: GameState,
  actions: readonly Action[],
  rng: Rng = createRng(1),
): { state: GameState; events: GameEvent[] } {
  let current = state;
  const events: GameEvent[] = [];
  for (const action of actions) {
    const result = applyAction(current, action, rng);
    current = result.state;
    events.push(...result.events);
  }
  return { state: current, events };
}

export const topDiscard = (state: GameState): Rank | undefined => {
  const top = state.discardPile.at(-1);
  return top === undefined ? undefined : cardOf(top).rank;
};
