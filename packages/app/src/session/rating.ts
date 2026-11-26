import type { BotProfile } from '@blanko/bots';
import { placementPointsByPlace, type RoundScore } from '@blanko/engine';
import type { Level } from '@blanko/bots';
import { LOCAL_SEAT } from './session.ts';

/**
 * Elo-Wertung des Menschen für den dynamischen Modus; nur im Einzelspielermodus. Sie liegt auf derselben Skala wie die im
 * Labor gemessenen Bot-Wertungen (400 Punkte Abstand ≙ 10:1 im Zweikampf).
 */
export interface PlayerRating {
  readonly rating: number;
  readonly rounds: number;
}

/** Wie stark sich eine Runde insgesamt auswirkt; in den ersten Runden doppelt, damit die Wertung schnell passt. */
const ROUND_K = 40;
const PROVISIONAL_ROUNDS = 10;

/** Wahrscheinlichkeit, im Zweikampf vor einem Gegner zu landen. */
export function winProbability(rating: number, opponent: number): number {
  return 1 / (1 + 10 ** ((opponent - rating) / 400));
}

/**
 * Paarweise Anpassung: Jeder Gegner ist ein Zweikampf, gewonnen, wenn der Mensch vor ihm liegt.
 * Der Faktor wird auf die Gegner verteilt, damit eine Runde zu sechst nicht mehr zählt als zu zweit.
 */
export function updateRating(
  current: PlayerRating,
  score: RoundScore,
  opponentRating: number,
): PlayerRating {
  const opponents = score.ranking.length - 1;
  const humanPlace = score.ranking.indexOf(LOCAL_SEAT);
  const k = (current.rounds < PROVISIONAL_ROUNDS ? 2 * ROUND_K : ROUND_K) / opponents;
  const expected = winProbability(current.rating, opponentRating);
  let change = 0;
  score.ranking.forEach((player, place) => {
    if (player === LOCAL_SEAT) return;
    const won = humanPlace < place ? 1 : 0;
    change += k * (won - expected);
  });
  return { rating: current.rating + change, rounds: current.rounds + 1 };
}

function binomial(n: number, k: number, p: number): number {
  let coefficient = 1;
  for (let i = 1; i <= k; i++) coefficient = (coefficient * (n - k + i)) / i;
  return coefficient * p ** k * (1 - p) ** (n - k);
}

/**
 * Erwartete Platzierungspunkte gegen einen Tisch aus lauter Gegnern derselben Wertung. Modell: Jeder
 * Zweikampf ist unabhängig; wer k Gegner schlägt, landet auf Platz n − k.
 */
export function expectedPlacementPoints(
  rating: number,
  opponentRating: number,
  playerCount: number,
): number {
  const opponents = playerCount - 1;
  const p = winProbability(rating, opponentRating);
  const byPlace = placementPointsByPlace(playerCount);
  let expected = 0;
  for (let beaten = 0; beaten <= opponents; beaten++) {
    expected += binomial(opponents, beaten, p) * (byPlace[opponents - beaten] ?? 0);
  }
  return expected;
}

/** Das Leiter-Profil, gegen das der Mensch im Schnitt etwa 0 Platzierungspunkte erwartet. */
export function chooseOpponent(
  ladder: readonly BotProfile[],
  rating: number,
  playerCount: number,
): BotProfile {
  let best = ladder[0];
  let bestGap = Infinity;
  for (const profile of ladder) {
    const gap = Math.abs(expectedPlacementPoints(rating, profile.rating ?? 0, playerCount));
    if (gap < bestGap) {
      best = profile;
      bestGap = gap;
    }
  }
  if (best === undefined) throw new Error('Die Leiter ist leer');
  return best;
}

/** Feste Stufe mit der nächstliegenden Wertung, für die Anzeige „etwa Stark“. */
export function nearestLevel(levels: readonly Level[], rating: number): Level | undefined {
  return [...levels].sort(
    (a, b) =>
      Math.abs((a.profile.rating ?? 0) - rating) - Math.abs((b.profile.rating ?? 0) - rating),
  )[0];
}

/**
 * Startwert: die Wertung der Stufe „Mittel“. Die rechnerische Mitte der Leiter läge näher an „Stark“
 * und wäre für Neulinge zu hoch.
 */
export function initialRating(levels: readonly Level[]): PlayerRating {
  const middle = levels.find((l) => l.level === 'mittel') ?? levels[0];
  return { rating: middle?.profile.rating ?? 1500, rounds: 0 };
}

const KEY = 'blanko.rating.v1';

export function loadRating(
  storage: Pick<Storage, 'getItem'>,
  fallback: PlayerRating,
): PlayerRating {
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? 'null') as Partial<PlayerRating> | null;
    return typeof parsed?.rating === 'number' && typeof parsed.rounds === 'number'
      ? { rating: parsed.rating, rounds: parsed.rounds }
      : fallback;
  } catch {
    return fallback;
  }
}

export function saveRating(storage: Pick<Storage, 'setItem'>, rating: PlayerRating): void {
  try {
    storage.setItem(KEY, JSON.stringify(rating));
  } catch {
    // Ohne Speicher beginnt die Wertung beim nächsten Start neu; das Spiel läuft weiter.
  }
}
