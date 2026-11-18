import type { Action, PlayerView, Rng } from '@blanko/engine';

/**
 * Gemeinsame Schnittstelle aller Bots (Strategy-Muster). Ein Bot sieht nur seine PlayerView
 * und kann deshalb nicht schummeln. Gedächtnis und Vergessen stecken bereits in der Sicht,
 * die er bekommt (siehe memory.ts).
 */
export interface Bot {
  chooseAction(view: PlayerView, legal: readonly Action[], rng: Rng): Action;
}

/** Zufällige Wahl aus einer nicht leeren Liste. */
export function pickRandom<T>(items: readonly T[], rng: Rng): T {
  const item = items[rng.nextInt(items.length)];
  if (item === undefined) {
    throw new Error('Aus einer leeren Liste kann nicht gewählt werden');
  }
  return item;
}
