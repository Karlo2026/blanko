import type { CardId } from './cards.ts';
import { forgetAll } from './knowledge.ts';
import type { Rng } from './rng.ts';
import { RULES } from './rules.ts';
import { shuffle } from './shuffle.ts';
import type { GameState } from './state.ts';

type Piles = Pick<GameState, 'drawPile' | 'discardPile' | 'knowledge'>;

interface TakeResult {
  readonly piles: Piles;
  /** null, wenn auch nach dem Neumischen keine Karte verfügbar ist. */
  readonly card: CardId | null;
  readonly reshuffled: boolean;
}

function reshufflableCount(discardPile: readonly CardId[]): number {
  return RULES.reshuffleKeepsTopDiscard ? Math.max(0, discardPile.length - 1) : discardPile.length;
}

export function canTakeFromDrawPile(piles: Piles): boolean {
  return piles.drawPile.length > 0 || reshufflableCount(piles.discardPile) > 0;
}

/** Neu gemischte Karten liegen verdeckt und in unbekannter Reihenfolge; deshalb vergisst jeder sie. */
function reshuffle(piles: Piles, rng: Rng): Piles {
  const keep = piles.discardPile.length - reshufflableCount(piles.discardPile);
  const recycled = piles.discardPile.slice(0, piles.discardPile.length - keep);
  return {
    drawPile: shuffle(recycled, rng),
    discardPile: piles.discardPile.slice(piles.discardPile.length - keep),
    knowledge: forgetAll(piles.knowledge, recycled),
  };
}

export function takeFromDrawPile(piles: Piles, rng: Rng): TakeResult {
  const reshuffled = piles.drawPile.length === 0 && canTakeFromDrawPile(piles);
  const source = reshuffled ? reshuffle(piles, rng) : piles;
  const card = source.drawPile.at(-1);
  if (card === undefined) {
    return { piles: source, card: null, reshuffled };
  }
  return { piles: { ...source, drawPile: source.drawPile.slice(0, -1) }, card, reshuffled };
}
