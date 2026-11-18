import { at } from './list.ts';
import type { Rng } from './rng.ts';
import { nextPlayer, type PlayerId } from './state.ts';

/** A10: Der Geber der ersten Runde wird zufällig bestimmt. */
export function chooseFirstDealer(playerCount: number, rng: Rng): PlayerId {
  return rng.nextInt(playerCount);
}

/** A10: Danach wechselt der Geber jede Runde im Uhrzeigersinn. */
export function nextDealer(dealer: PlayerId, playerCount: number): PlayerId {
  return nextPlayer(dealer, playerCount);
}

/** Eine Sitzung summiert die Platzierungspunkte beliebig vieler Runden. */
export function addRoundToTotals(
  totals: readonly number[],
  placementPoints: readonly number[],
): readonly number[] {
  return totals.map((total, player) => total + at(placementPoints, player));
}
