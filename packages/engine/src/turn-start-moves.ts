import type { GameEvent } from './actions.ts';
import { cardOf } from './cards.ts';
import { learn, playerMask, revealToAll } from './knowledge.ts';
import { at, replaceAt } from './list.ts';
import { takeFromDrawPile } from './piles.ts';
import type { Rng } from './rng.ts';
import { RULES } from './rules.ts';
import type { GameState, Hand } from './state.ts';
import { discardFaceUp, endTurn, handOf, withHand, type ActionResult } from './turn.ts';

/** Ziehen beendet den Zug nicht; danach muss behalten oder abgelegt werden. */
export function draw(state: GameState, rng: Rng): ActionResult {
  const player = state.current;
  const { piles, card, reshuffled } = takeFromDrawPile(state, rng);
  if (card === null) {
    throw new Error('Ziehen ist ohne Karten im Nachziehstapel nicht erlaubt');
  }
  const events: GameEvent[] = reshuffled ? [{ type: 'reshuffled' }] : [];
  events.push({ type: 'drew', player });
  return {
    state: {
      ...state,
      ...piles,
      knowledge: learn(piles.knowledge, card, playerMask(player)),
      phase: { kind: 'drawn', card },
      matchableRank: null,
      canStillPeek: replaceAt(state.canStillPeek, player, false),
    },
    events,
  };
}

export function knock(state: GameState): ActionResult {
  const knocked: GameState = {
    ...state,
    knocker: state.current,
    turnsAfterKnock: state.playerCount - 1,
    matchableRank: null,
  };
  return endTurn(knocked, [{ type: 'knocked', player: state.current }], true);
}

function placePenalty(hand: Hand, card: number): { hand: Hand; slot: number } {
  const free = hand.indexOf(null);
  if (RULES.penaltyFillsEmptySlot && free !== -1) {
    return { hand: replaceAt(hand, free, card), slot: free };
  }
  return { hand: [...hand, card], slot: hand.length };
}

/** Falsch abgelegt: Karte zurück an ihren Platz, dazu eine unbesehene Strafkarte. */
function failMatch(state: GameState, slot: number, rng: Rng): ActionResult {
  const player = state.current;
  const card = at(handOf(state, player), slot);
  if (card === null) {
    throw new Error('Leerer Platz kann nicht abgelegt werden');
  }
  const knowledge = RULES.failedMatchRevealsToAll
    ? revealToAll(state.knowledge, card, state.playerCount)
    : learn(state.knowledge, card, playerMask(player));
  const { piles, card: penalty, reshuffled } = takeFromDrawPile({ ...state, knowledge }, rng);

  let next: GameState = { ...state, ...piles, matchableRank: null };
  let penaltySlot: number | null = null;
  if (penalty !== null) {
    const placed = placePenalty(handOf(next, player), penalty);
    next = withHand(next, player, placed.hand);
    penaltySlot = placed.slot;
  }
  const events: GameEvent[] = reshuffled ? [{ type: 'reshuffled' }] : [];
  events.push({ type: 'matchFailed', player, slot, card: cardOf(card), penaltySlot });
  return endTurn(next, events);
}

export function matchDiscard(state: GameState, slot: number, rng: Rng): ActionResult {
  const player = state.current;
  const card = at(handOf(state, player), slot);
  if (card === null || cardOf(card).rank !== state.matchableRank) {
    return failMatch(state, slot, rng);
  }
  const emptied = withHand(state, player, replaceAt(handOf(state, player), slot, null));
  const discarded = discardFaceUp(emptied, card);
  const next = RULES.matchChains ? discarded : { ...discarded, matchableRank: null };
  return endTurn(next, [{ type: 'matched', player, slot, card: cardOf(card) }]);
}
