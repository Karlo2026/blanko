import { ALL_CARD_IDS, cardOf, rankPoints, type Card, type CardId } from './cards.ts';
import { everyoneMask, learn, playerMask, type Knowledge } from './knowledge.ts';
import type { Rng } from './rng.ts';
import { shuffle } from './shuffle.ts';
import type { GameState, Hand, Phase, Slot } from './state.ts';
import type { PlayerView } from './view.ts';

function seenCards(view: PlayerView): Set<CardId> {
  const seen = new Set<CardId>(view.discardPile.map((card) => card.id));
  for (const hand of view.hands) {
    for (const slot of hand) {
      if (slot.kind === 'known') seen.add(slot.card.id);
    }
  }
  if (view.drawnCard !== null) seen.add(view.drawnCard.id);
  return seen;
}

/**
 * Wissen im erzeugten Zustand. Was die Gegner wirklich wissen, verrät die Sicht nicht; deshalb
 * kennt jeder Gegner jede seiner Karten mit der Wahrscheinlichkeit `opponentSelfKnowledge`.
 */
function assumedKnowledge(
  view: PlayerView,
  hands: readonly Hand[],
  drawn: CardId | null,
  opponentSelfKnowledge: number,
  rng: Rng,
): Knowledge {
  let knowledge: Knowledge = ALL_CARD_IDS.map(() => 0);
  for (const card of view.discardPile) {
    knowledge = learn(knowledge, card.id, everyoneMask(view.playerCount));
  }
  view.hands.forEach((hand, player) => {
    hand.forEach((slot, index) => {
      const card = hands[player]?.[index] ?? null;
      if (card === null) return;
      if (slot.kind === 'known') knowledge = learn(knowledge, card, playerMask(view.viewer));
      if (player !== view.viewer && rng.next() < opponentSelfKnowledge) {
        knowledge = learn(knowledge, card, playerMask(player));
      }
    });
  });
  return drawn === null ? knowledge : learn(knowledge, drawn, playerMask(view.current));
}

/** Zieht ohne Zurücklegen; bei `limit` haben Karten über dessen Punktwert nur das Gewicht 1 − reading. */
function drawCard(pool: CardId[], limit: Card | undefined, reading: number, rng: Rng): CardId {
  if (pool.length === 0) throw new Error('Sicht ist widersprüchlich: zu wenige unbekannte Karten');
  let index = pool.length - 1;
  if (limit !== undefined && reading > 0) {
    const cap = rankPoints(limit.rank);
    const weights = pool.map((id) => (rankPoints(cardOf(id).rank) <= cap ? 1 : 1 - reading));
    let target = rng.next() * weights.reduce((a, b) => a + b, 0);
    index = 0;
    while (index < pool.length - 1 && target >= (weights[index] ?? 0)) {
      target -= weights[index] ?? 0;
      index++;
    }
  }
  const [card] = pool.splice(index, 1);
  return card ?? 0;
}

/**
 * Belegt alle verdeckten Plätze. Plätze mit beobachteter Herkunft kommen zuerst an die Reihe, damit
 * die Gewichtung dort greift, bevor niedrige Karten an andere Plätze vergeben sind.
 */
function fillHands(view: PlayerView, pool: CardId[], reading: number, rng: Rng): Hand[] {
  const hands: Slot[][] = view.hands.map((hand) =>
    hand.map((slot) => (slot.kind === 'known' ? slot.card.id : null)),
  );
  const hidden = view.hands.flatMap((hand, player) =>
    hand.flatMap((slot, index) =>
      slot.kind === 'hidden' ? [{ player, index, keptOver: slot.keptOver }] : [],
    ),
  );
  const ordered = [
    ...hidden.filter((h) => h.keptOver !== undefined),
    ...hidden.filter((h) => h.keptOver === undefined),
  ];
  for (const { player, index, keptOver } of ordered) {
    const hand = hands[player];
    if (hand !== undefined) hand[index] = drawCard(pool, keptOver, reading, rng);
  }
  return hands;
}

/** Herkunft im erzeugten Zustand: wie in der Sicht beobachtet, sonst keine. */
function assumedKeptOver(view: PlayerView, hands: readonly Hand[]): (CardId | null)[] {
  const keptOver: (CardId | null)[] = ALL_CARD_IDS.map(() => null);
  view.hands.forEach((hand, player) => {
    hand.forEach((slot, index) => {
      const card = hands[player]?.[index];
      if (
        slot.kind === 'hidden' &&
        slot.keptOver !== undefined &&
        card !== undefined &&
        card !== null
      ) {
        keptOver[card] = slot.keptOver.id;
      }
    });
  });
  return keptOver;
}

/**
 * Erzeugt einen vollständigen Zustand, der zur Sicht eines Spielers passt: Bekanntes bleibt,
 * alle ihm unbekannten Karten werden zufällig auf verdeckte Plätze und Nachziehstapel verteilt.
 * Grundlage für Information Set Monte Carlo Tree Search.
 *
 * `reading` (0 bis 1) liest Gegner: Wer eine gezogene Karte behalten und dafür eine Karte offen
 * abgeworfen hat, hat vermutlich eine niedrigere bekommen. Bei 1 bekommt ein solcher Platz nur noch
 * Karten bis zum Wert der abgeworfenen, bei 0 ist die Verteilung gleichmäßig.
 */
export function determinize(
  view: PlayerView,
  rng: Rng,
  opponentSelfKnowledge: number,
  reading: number,
): GameState {
  const seen = seenCards(view);
  const pool = shuffle(
    ALL_CARD_IDS.filter((id) => !seen.has(id)),
    rng,
  );
  const hands = fillHands(view, pool, reading, rng);
  const drawn =
    view.phase === 'drawn' ? (view.drawnCard?.id ?? drawCard(pool, undefined, 0, rng)) : null;
  if (pool.length !== view.drawPileSize) {
    throw new Error(
      'Sicht ist widersprüchlich: Nachziehstapel passt nicht zu den unbekannten Karten',
    );
  }
  const phase: Phase =
    drawn === null
      ? { kind: view.phase === 'roundOver' ? 'roundOver' : 'turnStart' }
      : { kind: 'drawn', card: drawn };

  return {
    playerCount: view.playerCount,
    dealer: view.dealer,
    current: view.current,
    phase,
    hands,
    drawPile: pool,
    discardPile: view.discardPile.map((card) => card.id),
    knowledge: assumedKnowledge(view, hands, drawn, opponentSelfKnowledge, rng),
    matchableRank: view.matchableRank,
    knocker: view.knocker,
    turnsAfterKnock: view.turnsAfterKnock,
    turnCount: view.turnCount,
    canStillPeek: view.hands.map((_, player) => player === view.viewer && view.canStillPeek),
    keptOver: assumedKeptOver(view, hands),
  };
}
