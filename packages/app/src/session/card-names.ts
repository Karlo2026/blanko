import type { Card, Rank } from '@blanko/engine';

const LABELS: Partial<Record<Rank, string>> = { 1: 'A', 11: 'B', 12: 'D', 13: 'K' };
const ACCUSATIVES: Partial<Record<Rank, string>> = {
  1: 'ein Ass',
  11: 'einen Buben',
  12: 'eine Dame',
  13: 'einen König',
};

/** Kurzbezeichnung auf der Karte: A, 2 bis 10, B, D, K. */
export function rankLabel(rank: Rank): string {
  return LABELS[rank] ?? String(rank);
}

/** Rang im Akkusativ für Sätze wie „legt … ab“: „ein Ass“, „einen Buben“, „eine 7“. */
export function rankAccusative(rank: Rank): string {
  return ACCUSATIVES[rank] ?? `eine ${String(rank)}`;
}

export function cardAccusative(card: Card): string {
  return rankAccusative(card.rank);
}

export const SUIT_SYMBOLS: Record<Card['suit'], string> = {
  // U+FE0E erzwingt die Textdarstellung, damit iOS keine Emoji-Symbole zeigt.
  clubs: '♣︎',
  diamonds: '♦︎',
  hearts: '♥︎',
  spades: '♠︎',
};

export const isRed = (card: Card): boolean => card.suit === 'hearts' || card.suit === 'diamonds';
