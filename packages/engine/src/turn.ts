import type { GameEvent } from './actions.ts';
import { cardOf, type CardId } from './cards.ts';
import { revealToAll } from './knowledge.ts';
import { at, replaceAt } from './list.ts';
import { canTakeFromDrawPile } from './piles.ts';
import { nextPlayer, type GameState, type Hand, type PlayerId } from './state.ts';

export interface ActionResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export function handOf(state: GameState, player: PlayerId): Hand {
  return at(state.hands, player);
}

export function withHand(state: GameState, player: PlayerId, hand: Hand): GameState {
  return { ...state, hands: replaceAt(state.hands, player, hand) };
}

/** Offen auf den Ablagestapel: Alle sehen die Karte, der nächste Spieler darf gleichen Rang nachlegen. */
export function discardFaceUp(state: GameState, card: CardId): GameState {
  return {
    ...state,
    discardPile: [...state.discardPile, card],
    knowledge: revealToAll(state.knowledge, card, state.playerCount),
    matchableRank: cardOf(card).rank,
  };
}

/**
 * Schließt den Zug ab. Nach dem Klopfen hat jeder andere Spieler genau noch einen Zug,
 * danach ist die Runde vorbei. A11: Kann der nächste Spieler nicht ziehen, weil auch
 * Neumischen keine Karte mehr liefert, endet die Runde sofort.
 */
export function endTurn(
  state: GameState,
  events: readonly GameEvent[],
  knockedNow = false,
): ActionResult {
  const turnsAfterKnock =
    state.knocker !== null && !knockedNow ? state.turnsAfterKnock - 1 : state.turnsAfterKnock;
  const base = { ...state, turnCount: state.turnCount + 1, turnsAfterKnock };

  if ((state.knocker !== null && turnsAfterKnock === 0) || !canTakeFromDrawPile(state)) {
    return {
      state: { ...base, phase: { kind: 'roundOver' } },
      events: [...events, { type: 'roundEnded' }],
    };
  }
  return {
    state: {
      ...base,
      phase: { kind: 'turnStart' },
      current: nextPlayer(state.current, state.playerCount),
    },
    events,
  };
}
