import { ALL_CARD_IDS, cardOf, type CardId } from './cards.ts';
import { everyoneMask, learn, playerMask, type Knowledge } from './knowledge.ts';
import { at } from './list.ts';
import type { Rng } from './rng.ts';
import { RULES } from './rules.ts';
import { shuffle } from './shuffle.ts';
import {
  BOTTOM_SLOTS,
  INITIAL_HAND_SIZE,
  nextPlayer,
  type GameState,
  type Hand,
  type PlayerId,
} from './state.ts';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

interface RoundSetup {
  readonly playerCount: number;
  readonly dealer: PlayerId;
}

function assertValidSetup({ playerCount, dealer }: RoundSetup): void {
  if (!Number.isInteger(playerCount) || playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) {
    throw new RangeError(
      `Blanko braucht ${String(MIN_PLAYERS)} bis ${String(MAX_PLAYERS)} Spieler`,
    );
  }
  if (!Number.isInteger(dealer) || dealer < 0 || dealer >= playerCount) {
    throw new RangeError(`Ungültiger Geber: ${String(dealer)}`);
  }
}

function dealHands(deck: readonly CardId[], playerCount: number): Hand[] {
  return Array.from({ length: playerCount }, (_, player) =>
    deck.slice(player * INITIAL_HAND_SIZE, (player + 1) * INITIAL_HAND_SIZE),
  );
}

function initialKnowledge(hands: readonly Hand[]): Knowledge {
  let knowledge: Knowledge = ALL_CARD_IDS.map(() => 0);
  hands.forEach((hand, player) => {
    for (const slot of BOTTOM_SLOTS) {
      const card = at(hand, slot);
      if (card !== null) {
        knowledge = learn(knowledge, card, playerMask(player));
      }
    }
  });
  return knowledge;
}

/** Mischen, austeilen, Startkarte aufdecken. Der Spieler links vom Geber beginnt. */
export function startRound(setup: RoundSetup, rng: Rng): GameState {
  assertValidSetup(setup);
  const { playerCount, dealer } = setup;
  const deck = shuffle(ALL_CARD_IDS, rng);
  const hands = dealHands(deck, playerCount);
  const rest = deck.slice(playerCount * INITIAL_HAND_SIZE);
  const startCard = at(rest, rest.length - 1);

  return {
    playerCount,
    dealer,
    current: nextPlayer(dealer, playerCount),
    phase: { kind: 'turnStart' },
    hands,
    drawPile: rest.slice(0, -1),
    discardPile: [startCard],
    knowledge: learn(initialKnowledge(hands), startCard, everyoneMask(playerCount)),
    matchableRank: RULES.matchOnStartCard ? cardOf(startCard).rank : null,
    knocker: null,
    turnsAfterKnock: 0,
    turnCount: 0,
    canStillPeek: hands.map(() => true),
    keptOver: ALL_CARD_IDS.map(() => null),
  };
}
