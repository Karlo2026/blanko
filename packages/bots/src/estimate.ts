import {
  ALL_CARD_IDS,
  cardOf,
  rankPoints,
  type CardId,
  type PlayerView,
  type Rank,
  type Rng,
  type SlotView,
} from '@blanko/engine';

/** Alle Karten, deren Platz der Spieler kennt: Ablagestapel, bekannte Handkarten, gezogene Karte. */
function seenCardIds(view: PlayerView): Set<CardId> {
  const seen = new Set<CardId>(view.discardPile.map((card) => card.id));
  for (const hand of view.hands) {
    for (const slot of hand) {
      if (slot.kind === 'known') seen.add(slot.card.id);
    }
  }
  if (view.drawnCard !== null) seen.add(view.drawnCard.id);
  return seen;
}

/** Karten, die irgendwo verdeckt liegen können (Nachziehstapel oder unbekannte Handplätze). */
function unseenCards(view: PlayerView): CardId[] {
  const seen = seenCardIds(view);
  return ALL_CARD_IDS.filter((id) => !seen.has(id));
}

/** Erwartungswert einer unbekannten Karte, gezählt über alle noch nicht gesehenen Karten. */
export function expectedUnknownValue(view: PlayerView): number {
  const unseen = unseenCards(view);
  if (unseen.length === 0) return 0;
  return unseen.reduce((sum, id) => sum + rankPoints(cardOf(id).rank), 0) / unseen.length;
}

/** Wahrscheinlichkeit, dass eine unbekannte Karte den gegebenen Rang hat. */
export function rankProbability(view: PlayerView, rank: Rank): number {
  const unseen = unseenCards(view);
  if (unseen.length === 0) return 0;
  return unseen.filter((id) => cardOf(id).rank === rank).length / unseen.length;
}

/**
 * Geschätzte Handpunkte: bekannte Ränge einmal gezählt, unbekannte Karten mit Erwartungswert.
 * Paare unter den unbekannten Karten bleiben unberücksichtigt; der Fehler ist klein.
 */
export function estimateHand(hand: readonly SlotView[], unknownValue: number): number {
  const ranks = new Set<Rank>();
  let hidden = 0;
  for (const slot of hand) {
    if (slot.kind === 'known') ranks.add(slot.card.rank);
    if (slot.kind === 'hidden') hidden++;
  }
  let sum = hidden * unknownValue;
  for (const rank of ranks) sum += rankPoints(rank);
  return sum;
}

/** Handpunkte, wenn die verdeckten Plätze mit den gegebenen Karten belegt werden. */
function sampledHandPoints(hand: readonly SlotView[], fill: () => CardId): number {
  const ranks = new Set<Rank>();
  for (const slot of hand) {
    if (slot.kind === 'known') ranks.add(slot.card.rank);
    if (slot.kind === 'hidden') ranks.add(cardOf(fill()).rank);
  }
  let sum = 0;
  for (const rank of ranks) sum += rankPoints(rank);
  return sum;
}

/** Zieht ohne Zurücklegen; niedrige Karten mit Gewicht exp(−bias · Punkte) bevorzugt. */
function drawWeighted(pool: CardId[], bias: number, rng: Rng): CardId {
  if (bias === 0 || pool.length <= 1) {
    const index = rng.nextInt(Math.max(1, pool.length));
    const [card] = pool.splice(index, 1);
    return card ?? 0;
  }
  const weights = pool.map((id) => Math.exp(-bias * rankPoints(cardOf(id).rank)));
  let target = rng.next() * weights.reduce((a, b) => a + b, 0);
  let index = 0;
  while (index < pool.length - 1 && target >= (weights[index] ?? 0)) {
    target -= weights[index] ?? 0;
    index++;
  }
  const [card] = pool.splice(index, 1);
  return card ?? 0;
}

/**
 * Wie wahrscheinlich der Betrachter allein die niedrigste Hand hat. Geschätzt, indem alle ihm
 * unbekannten Plätze mehrfach zufällig aus den ungesehenen Karten belegt werden.
 *
 * Verdeckte Gegnerkarten sind nicht gleichverteilt: Gegner behalten niedrige Karten und werfen
 * hohe ab. Gleichverteilt gezogen war die Schätzung weit zu optimistisch (geschätzt über 90 %,
 * tatsächlich 54 %). `opponentLowBias` gleicht das aus; eigene verdeckte Karten wurden nicht
 * ausgesucht und bleiben gleichverteilt.
 */
export function soleLowestProbability(
  view: PlayerView,
  samples: number,
  opponentLowBias: number,
  rng: Rng,
): number {
  const unseen = unseenCards(view);
  let wins = 0;
  for (let i = 0; i < samples; i++) {
    const pool = [...unseen];
    const points = view.hands.map((hand, player) => {
      const bias = player === view.viewer ? 0 : opponentLowBias;
      return sampledHandPoints(hand, () => drawWeighted(pool, bias, rng));
    });
    const own = points[view.viewer] ?? 0;
    if (points.every((p, player) => player === view.viewer || p > own)) wins++;
  }
  return wins / samples;
}
