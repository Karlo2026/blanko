/** Ein normales Deck ohne Joker. */
export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Suit = (typeof SUITS)[number];

/** 1 = Ass, 11 = Bube, 12 = Dame, 13 = König. */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

/**
 * Feste Kennung einer Karte (0 bis 51). Das Wissen der Spieler hängt an dieser ID,
 * nicht am Platz, damit es bei Tauschen automatisch mitwandert.
 */
export type CardId = number;

export interface Card {
  readonly id: CardId;
  readonly rank: Rank;
  readonly suit: Suit;
}

const RANKS_PER_SUIT = 13;
export const DECK_SIZE = SUITS.length * RANKS_PER_SUIT;

const CARDS: readonly Card[] = Array.from({ length: DECK_SIZE }, (_, id) => ({
  id,
  rank: ((id % RANKS_PER_SUIT) + 1) as Rank,
  suit: SUITS[Math.floor(id / RANKS_PER_SUIT)] ?? 'clubs',
}));

export const ALL_CARD_IDS: readonly CardId[] = CARDS.map((card) => card.id);

export function cardOf(id: CardId): Card {
  const card = CARDS[id];
  if (card === undefined) {
    throw new RangeError(`Unbekannte Karten-ID: ${String(id)}`);
  }
  return card;
}

export function cardIdOf(rank: Rank, suit: Suit): CardId {
  return SUITS.indexOf(suit) * RANKS_PER_SUIT + rank - 1;
}

/** Ass 1, 2 bis 10 Augenzahl, Bube/Dame/König 10. */
export function rankPoints(rank: Rank): number {
  return Math.min(rank, 10);
}
