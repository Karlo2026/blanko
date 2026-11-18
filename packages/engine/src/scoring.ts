import { ALL_CARD_IDS, cardOf, rankPoints, type CardId, type Rank } from './cards.ts';
import { at } from './list.ts';
import type { Rng } from './rng.ts';
import { shuffle } from './shuffle.ts';
import type { GameState, Hand, PlayerId } from './state.ts';

export interface RoundScore {
  /** Handpunkte je Spieler. */
  readonly handPoints: readonly number[];
  /** Spieler in Platzierungsreihenfolge, Platz 1 zuerst. */
  readonly ranking: readonly PlayerId[];
  /** Platzierungspunkte je Spieler (Index = Spieler). */
  readonly placementPoints: readonly number[];
}

/** Gleiche Ränge zählen nur einmal: zwei Könige 10 Punkte, König und Dame 20. */
export function handPoints(hand: Hand): number {
  const ranks = new Set<Rank>();
  for (const card of hand) {
    if (card !== null) {
      ranks.add(cardOf(card).rank);
    }
  }
  let sum = 0;
  for (const rank of ranks) {
    sum += rankPoints(rank);
  }
  return sum;
}

/** Platz 1 +2, letzter −2; ab 4 Spielern zusätzlich Platz 2 +1 und vorletzter −1. Summe immer 0. */
export function placementPointsByPlace(playerCount: number): readonly number[] {
  const points = new Array<number>(playerCount).fill(0);
  points[0] = 2;
  points[playerCount - 1] = -2;
  if (playerCount >= 4) {
    points[1] = 1;
    points[playerCount - 2] = -1;
  }
  return points;
}

/**
 * Gleichstand: Die Beteiligten ziehen je eine Karte aus einem frisch gemischten vollen Deck,
 * die niedrigste gewinnt. Bei gleichem Wert ziehen die Betroffenen erneut.
 */
function breakTie(players: readonly PlayerId[], rng: Rng): PlayerId[] {
  if (players.length <= 1) {
    return [...players];
  }
  const deck = shuffle(ALL_CARD_IDS, rng);
  const drawnValue = (index: number): number => rankPoints(cardOf(at<CardId>(deck, index)).rank);
  const values = new Map(players.map((player, index) => [player, drawnValue(index)]));
  return orderByValue(players, (player) => values.get(player) ?? 0, rng);
}

/** Aufsteigend nach Wert; Gruppen mit gleichem Wert werden per Kartenziehen aufgelöst. */
function orderByValue(
  players: readonly PlayerId[],
  valueOf: (player: PlayerId) => number,
  rng: Rng,
): PlayerId[] {
  const distinct = [...new Set(players.map(valueOf))].sort((a, b) => a - b);
  return distinct.flatMap((value) =>
    breakTie(
      players.filter((player) => valueOf(player) === value),
      rng,
    ),
  );
}

/** Ein Klopfer, der nicht allein die niedrigste Punktzahl hat, wird Letzter – auch bei Gleichstand. */
function knockerFailed(points: readonly number[], knocker: PlayerId | null): boolean {
  if (knocker === null) {
    return false;
  }
  const own = at(points, knocker);
  return points.some((value, player) => player !== knocker && value <= own);
}

export function scoreRound(state: GameState, rng: Rng): RoundScore {
  const points = state.hands.map(handPoints);
  const players = points.map((_, player) => player);
  const valueOf = (player: PlayerId): number => at(points, player);
  const { knocker } = state;

  const ranking =
    knocker !== null && knockerFailed(points, knocker)
      ? [
          ...orderByValue(
            players.filter((p) => p !== knocker),
            valueOf,
            rng,
          ),
          knocker,
        ]
      : orderByValue(players, valueOf, rng);

  const byPlace = placementPointsByPlace(state.playerCount);
  const placementPoints = new Array<number>(state.playerCount).fill(0);
  ranking.forEach((player, place) => {
    placementPoints[player] = at(byPlace, place);
  });
  return { handPoints: points, ranking, placementPoints };
}
