import {
  addRoundToTotals,
  chooseFirstDealer,
  nextDealer,
  startRound,
  type GameState,
  type RoundScore,
  type Rng,
} from '@blanko/engine';
import type { Level } from '../profiles.ts';

/** Der Mensch sitzt immer auf Platz 0, die Bots folgen im Uhrzeigersinn. */
export const HUMAN = 0;
const BOT_NAMES = ['Karl', 'Greta', 'Otto', 'Ilse', 'Bruno'];
export const MAX_BOTS = BOT_NAMES.length;

export interface Session {
  readonly level: Level;
  readonly names: readonly string[];
  /** Summe der Platzierungspunkte je Spieler. */
  readonly totals: readonly number[];
  /** Nummer der laufenden bzw. nächsten Runde, beginnend bei 1. */
  readonly round: number;
  readonly dealer: number;
}

export function createSession(level: Level, botCount: number, rng: Rng): Session {
  const names = ['Du', ...BOT_NAMES.slice(0, botCount)];
  return {
    level,
    names,
    totals: names.map(() => 0),
    round: 1,
    dealer: chooseFirstDealer(names.length, rng),
  };
}

export function startSessionRound(session: Session, rng: Rng): GameState {
  return startRound({ playerCount: session.names.length, dealer: session.dealer }, rng);
}

/** Bucht eine gewertete Runde: Punkte summieren, Geber im Uhrzeigersinn weiter. */
export function completeRound(session: Session, score: RoundScore): Session {
  return {
    ...session,
    totals: addRoundToTotals(session.totals, score.placementPoints),
    round: session.round + 1,
    dealer: nextDealer(session.dealer, session.names.length),
  };
}
