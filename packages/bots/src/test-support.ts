// Hilfen nur für Tests: Sichten gezielt zusammenbauen.
import {
  cardIdOf,
  cardOf,
  type Card,
  type PlayerView,
  type Rank,
  type SlotView,
  type Suit,
} from '@blanko/engine';
import type { RuleParams } from './rule-bot.ts';

export const cardFor = (rank: Rank, suit: Suit = 'clubs'): Card => cardOf(cardIdOf(rank, suit));
export const known = (rank: Rank, suit: Suit = 'clubs'): SlotView => ({
  kind: 'known',
  card: cardFor(rank, suit),
});
export const hidden: SlotView = { kind: 'hidden' };

export function makeView(view: Partial<PlayerView> & Pick<PlayerView, 'hands'>): PlayerView {
  return {
    viewer: 0,
    playerCount: view.hands.length,
    dealer: view.hands.length - 1,
    current: 0,
    phase: 'turnStart',
    drawnCard: null,
    drawPileSize: 30,
    discardPile: [cardFor(6, 'diamonds')],
    matchableRank: null,
    knocker: null,
    turnsAfterKnock: 0,
    turnCount: 4,
    canStillPeek: false,
    ...view,
  };
}

export const BASE_PARAMS: RuleParams = {
  keepMargin: 1,
  knockThresholds: [8, 7, 6, 5, 5],
  knockLead: 3,
  knockProgress: 0,
  knockWinProbability: 2,
  opponentLowBias: 0,
  peekOwnValue: 2,
  peekOpponentValue: 0.5,
  swapMargin: 2,
  suspicionThreshold: 2,
};

/** Passt die Größe des Nachziehstapels an, damit die Sicht determinisiert werden kann. */
export function consistent(view: PlayerView): PlayerView {
  const known = view.hands.flat().filter((slot) => slot.kind === 'known').length;
  const hidden = view.hands.flat().filter((slot) => slot.kind === 'hidden').length;
  const seen = known + view.discardPile.length + (view.drawnCard === null ? 0 : 1);
  return { ...view, drawPileSize: 52 - seen - hidden };
}
