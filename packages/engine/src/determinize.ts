import { ALL_CARD_IDS, type CardId } from './cards.ts';
import { everyoneMask, learn, playerMask, type Knowledge } from './knowledge.ts';
import type { Rng } from './rng.ts';
import { shuffle } from './shuffle.ts';
import type { GameState, Hand, Phase } from './state.ts';
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

/**
 * Erzeugt einen vollständigen Zustand, der zur Sicht eines Spielers passt: Bekanntes bleibt,
 * alle ihm unbekannten Karten werden zufällig auf verdeckte Plätze und Nachziehstapel verteilt.
 * Grundlage für Information Set Monte Carlo Tree Search.
 */
export function determinize(view: PlayerView, rng: Rng, opponentSelfKnowledge: number): GameState {
  const seen = seenCards(view);
  const unknown = shuffle(
    ALL_CARD_IDS.filter((id) => !seen.has(id)),
    rng,
  );
  const takeUnknown = (): CardId => {
    const card = unknown.pop();
    if (card === undefined)
      throw new Error('Sicht ist widersprüchlich: zu wenige unbekannte Karten');
    return card;
  };

  const hands: Hand[] = view.hands.map((hand) =>
    hand.map((slot) =>
      slot.kind === 'empty' ? null : slot.kind === 'known' ? slot.card.id : takeUnknown(),
    ),
  );
  const drawn = view.phase === 'drawn' ? (view.drawnCard?.id ?? takeUnknown()) : null;
  if (unknown.length !== view.drawPileSize) {
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
    drawPile: unknown,
    discardPile: view.discardPile.map((card) => card.id),
    knowledge: assumedKnowledge(view, hands, drawn, opponentSelfKnowledge, rng),
    matchableRank: view.matchableRank,
    knocker: view.knocker,
    turnsAfterKnock: view.turnsAfterKnock,
    turnCount: view.turnCount,
    canStillPeek: view.hands.map((_, player) => player === view.viewer && view.canStillPeek),
  };
}
