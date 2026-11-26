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

/** Spielstand einer Sitzung: Summe der Platzierungspunkte, Nummer der nächsten Runde, Geber. */
export interface Scoreboard {
  readonly totals: readonly number[];
  /** Nummer der laufenden bzw. nächsten Runde, beginnend bei 1. */
  readonly round: number;
  readonly dealer: PlayerId;
}

export function newScoreboard(playerCount: number, rng: Rng): Scoreboard {
  return {
    totals: Array.from({ length: playerCount }, () => 0),
    round: 1,
    dealer: chooseFirstDealer(playerCount, rng),
  };
}

/** Bucht eine gewertete Runde: Punkte summieren, nächste Runde, Geber im Uhrzeigersinn weiter. */
export function recordRound(board: Scoreboard, placementPoints: readonly number[]): Scoreboard {
  return {
    totals: addRoundToTotals(board.totals, placementPoints),
    round: board.round + 1,
    dealer: nextDealer(board.dealer, board.totals.length),
  };
}
