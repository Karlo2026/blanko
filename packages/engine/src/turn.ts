import type { GameEvent } from './actions.ts';
import { cardOf, type CardId, type Rank } from './cards.ts';
import { revealToAll } from './knowledge.ts';
import { at, replaceAt } from './list.ts';
import { canTakeFromDrawPile } from './piles.ts';
import { nextPlayer, type GameState, type Hand, type PlayerId, type SpecialRank } from './state.ts';

export interface ActionResult {
  readonly state: GameState;
  readonly events: readonly GameEvent[];
}

export function handOf(state: GameState, player: PlayerId): Hand {
  return at(state.hands, player);
}

export function cardAt(state: GameState, player: PlayerId, slot: number): CardId {
  const card = at(handOf(state, player), slot);
  if (card === null) {
    throw new Error(`Platz ${String(slot)} von Spieler ${String(player)} ist leer`);
  }
  return card;
}

const isSpecialRank = (rank: Rank): rank is SpecialRank => rank === 8 || rank === 9 || rank === 10;

/**
 * Nach einem offenen Ablegen: War es eine 8, 9 oder 10, folgt die Sonderfunktion als eigener Schritt
 * (Hausregel: bei jedem offenen Ablegen, auch aus der Hand); sonst endet der Zug.
 */
export function finishDiscard(
  state: GameState,
  discarded: CardId,
  events: readonly GameEvent[],
): ActionResult {
  const rank = cardOf(discarded).rank;
  return isSpecialRank(rank)
    ? { state: { ...state, phase: { kind: 'special', rank } }, events }
    : endTurn(state, events);
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
/**
 * Hausregel (19.11.2026): Wer seine letzte Karte ablegt, beendet die Runde sofort und wird Erster.
 * Eine abgelegte 8, 9 oder 10 wirkt dann nicht mehr; die anderen bekommen keinen Zug mehr.
 */
export function endRoundWithEmptyHand(
  state: GameState,
  events: readonly GameEvent[],
): ActionResult {
  return {
    state: { ...state, turnCount: state.turnCount + 1, phase: { kind: 'roundOver' } },
    events: [...events, { type: 'handEmptied', player: state.current }, { type: 'roundEnded' }],
  };
}

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
