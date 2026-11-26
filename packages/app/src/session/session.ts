import { BOT_NAMES, type BotProfile, type Level } from '@blanko/bots';
import {
  newScoreboard,
  recordRound,
  startRound,
  type GameState,
  type RoundScore,
  type Rng,
  type Scoreboard,
} from '@blanko/engine';

/** Im Einzelspielermodus sitzt der Mensch immer auf Platz 0, die Bots folgen im Uhrzeigersinn. */
export const LOCAL_SEAT = 0;
/** Bis zu fünf Bots, also höchstens sechs Spieler am Tisch. */
export const MAX_BOTS = 5;

/** Feste Stufe für die ganze Sitzung oder dynamisch nach der Spielerwertung. */
export type SessionMode =
  { readonly kind: 'fixed'; readonly level: Level } | { readonly kind: 'dynamic' };

export interface Session {
  readonly mode: SessionMode;
  /** Bot-Profil der laufenden bzw. nächsten Runde; im dynamischen Modus wechselt es. */
  readonly profile: BotProfile;
  readonly names: readonly string[];
  readonly board: Scoreboard;
}

export function createSession(
  mode: SessionMode,
  profile: BotProfile,
  botCount: number,
  rng: Rng,
): Session {
  const names = ['Du', ...BOT_NAMES.slice(0, botCount)];
  return { mode, profile, names, board: newScoreboard(names.length, rng) };
}

export function startSessionRound(session: Session, rng: Rng): GameState {
  return startRound({ playerCount: session.names.length, dealer: session.board.dealer }, rng);
}

/** Schlüssel für die Statistik: die Stufe oder „dynamisch“. */
export function statsKey(mode: SessionMode): string {
  return mode.kind === 'fixed' ? mode.level.level : 'dynamisch';
}

/**
 * Bucht eine gewertete Runde und setzt das Profil für die nächste Runde (bei fester Stufe bleibt es
 * gleich).
 */
export function completeRound(
  session: Session,
  score: RoundScore,
  nextProfile: BotProfile,
): Session {
  return {
    ...session,
    profile: nextProfile,
    board: recordRound(session.board, score.placementPoints),
  };
}
