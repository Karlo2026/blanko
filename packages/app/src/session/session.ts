import {
  addRoundToTotals,
  chooseFirstDealer,
  nextDealer,
  startRound,
  type GameState,
  type RoundScore,
  type Rng,
} from '@blanko/engine';
import type { BotProfile } from '@blanko/bots';
import type { Level } from '../profiles.ts';

/** Der Mensch sitzt immer auf Platz 0, die Bots folgen im Uhrzeigersinn. */
export const HUMAN = 0;
const BOT_NAMES = ['Karl', 'Greta', 'Otto', 'Ilse', 'Bruno'];
export const MAX_BOTS = BOT_NAMES.length;

/** Feste Stufe für die ganze Sitzung oder dynamisch nach der Spielerwertung. */
export type SessionMode =
  { readonly kind: 'fixed'; readonly level: Level } | { readonly kind: 'dynamic' };

export interface Session {
  readonly mode: SessionMode;
  /** Bot-Profil der laufenden bzw. nächsten Runde; im dynamischen Modus wechselt es. */
  readonly profile: BotProfile;
  readonly names: readonly string[];
  /** Summe der Platzierungspunkte je Spieler. */
  readonly totals: readonly number[];
  /** Nummer der laufenden bzw. nächsten Runde, beginnend bei 1. */
  readonly round: number;
  readonly dealer: number;
}

export function createSession(
  mode: SessionMode,
  profile: BotProfile,
  botCount: number,
  rng: Rng,
): Session {
  const names = ['Du', ...BOT_NAMES.slice(0, botCount)];
  return {
    mode,
    profile,
    names,
    totals: names.map(() => 0),
    round: 1,
    dealer: chooseFirstDealer(names.length, rng),
  };
}

export function startSessionRound(session: Session, rng: Rng): GameState {
  return startRound({ playerCount: session.names.length, dealer: session.dealer }, rng);
}

/** Schlüssel für die Statistik: die Stufe oder „dynamisch“. */
export function statsKey(mode: SessionMode): string {
  return mode.kind === 'fixed' ? mode.level.level : 'dynamisch';
}

/**
 * Bucht eine gewertete Runde: Punkte summieren, Geber im Uhrzeigersinn weiter und das Profil für die
 * nächste Runde setzen (bei fester Stufe bleibt es gleich).
 */
export function completeRound(
  session: Session,
  score: RoundScore,
  nextProfile: BotProfile,
): Session {
  return {
    ...session,
    profile: nextProfile,
    totals: addRoundToTotals(session.totals, score.placementPoints),
    round: session.round + 1,
    dealer: nextDealer(session.dealer, session.names.length),
  };
}
