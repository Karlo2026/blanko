import type { CardId } from './cards.ts';
import { at, replaceAt } from './list.ts';
import type { PlayerId } from './state.ts';

/**
 * Wer welche Karte kennt: pro Karten-ID eine Bitmaske der Spieler.
 * Bitmasken statt Mengen, weil das Labor tausende Partien pro Sekunde kopiert.
 */
export type Knowledge = readonly number[];

const NOBODY = 0;

export function playerMask(player: PlayerId): number {
  return 1 << player;
}

export function everyoneMask(playerCount: number): number {
  return (1 << playerCount) - 1;
}

export function knows(knowledge: Knowledge, card: CardId, player: PlayerId): boolean {
  return (at(knowledge, card) & playerMask(player)) !== 0;
}

export function learn(knowledge: Knowledge, card: CardId, mask: number): Knowledge {
  return replaceAt(knowledge, card, at(knowledge, card) | mask);
}

export function revealToAll(knowledge: Knowledge, card: CardId, playerCount: number): Knowledge {
  return replaceAt(knowledge, card, everyoneMask(playerCount));
}

export function forgetAll(knowledge: Knowledge, cards: readonly CardId[]): Knowledge {
  const forgotten = new Set(cards);
  return knowledge.map((mask, card) => (forgotten.has(card) ? NOBODY : mask));
}
