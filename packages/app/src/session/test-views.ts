// Hilfen nur für Tests: Sichten gezielt zusammenbauen.
import {
  cardIdOf,
  cardOf,
  type Card,
  type PlayerView,
  type Rank,
  type SlotView,
} from '@blanko/engine';

export const cardFor = (rank: Rank): Card => cardOf(cardIdOf(rank, 'hearts'));
export const known = (rank: Rank): SlotView => ({ kind: 'known', card: cardFor(rank) });
export const hidden: SlotView = { kind: 'hidden' };
const fourHidden = [hidden, hidden, hidden, hidden];

export function viewWith(view: Partial<PlayerView>): PlayerView {
  return {
    viewer: 0,
    playerCount: 3,
    dealer: 2,
    current: 0,
    phase: 'turnStart',
    drawnCard: null,
    specialRank: null,
    hands: [fourHidden, fourHidden, fourHidden],
    drawPileSize: 30,
    discardPile: [cardFor(7)],
    matchableRank: null,
    knocker: null,
    turnsAfterKnock: 0,
    turnCount: 3,
    canStillPeek: false,
    ...view,
  };
}
