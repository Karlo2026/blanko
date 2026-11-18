import {
  ALL_CARD_IDS,
  cardOf,
  rankPoints,
  type CardId,
  type PlayerView,
  type Rank,
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
