import { cardOf, type Card, type Rank } from './cards.ts';
import { knows } from './knowledge.ts';
import { at } from './list.ts';
import type { GameState, PlayerId } from './state.ts';

/** Was ein Spieler über einen Platz weiß. Unbekannte Karten verraten nicht einmal ihre ID. */
export type SlotView =
  | { readonly kind: 'empty' }
  | { readonly kind: 'hidden' }
  | { readonly kind: 'known'; readonly card: Card };

export interface PlayerView {
  readonly viewer: PlayerId;
  readonly playerCount: number;
  readonly dealer: PlayerId;
  readonly current: PlayerId;
  readonly phase: 'turnStart' | 'drawn' | 'roundOver';
  /** Nur gesetzt, wenn der Betrachter selbst gerade gezogen hat. */
  readonly drawnCard: Card | null;
  readonly hands: readonly (readonly SlotView[])[];
  readonly drawPileSize: number;
  /** Der Ablagestapel liegt offen; oberste Karte zuletzt. */
  readonly discardPile: readonly Card[];
  readonly matchableRank: Rank | null;
  readonly knocker: PlayerId | null;
  readonly turnsAfterKnock: number;
  readonly turnCount: number;
  /** Ob der Betrachter seine unteren Karten noch offen vor sich sehen darf. */
  readonly canStillPeek: boolean;
}

/**
 * Genau das, was dieser Spieler wissen darf. Bots und Oberfläche sehen nur diese Sicht.
 * Am Rundenende decken alle auf; dann ist jede Karte bekannt.
 */
export function getPlayerView(state: GameState, viewer: PlayerId): PlayerView {
  const revealed = state.phase.kind === 'roundOver';
  const hands = state.hands.map((hand) =>
    hand.map((card): SlotView => {
      if (card === null) {
        return { kind: 'empty' };
      }
      return revealed || knows(state.knowledge, card, viewer)
        ? { kind: 'known', card: cardOf(card) }
        : { kind: 'hidden' };
    }),
  );
  return {
    viewer,
    playerCount: state.playerCount,
    dealer: state.dealer,
    current: state.current,
    phase: state.phase.kind,
    drawnCard:
      state.phase.kind === 'drawn' && state.current === viewer ? cardOf(state.phase.card) : null,
    hands,
    drawPileSize: state.drawPile.length,
    discardPile: state.discardPile.map(cardOf),
    matchableRank: state.matchableRank,
    knocker: state.knocker,
    turnsAfterKnock: state.turnsAfterKnock,
    turnCount: state.turnCount,
    canStillPeek: at(state.canStillPeek, viewer),
  };
}
