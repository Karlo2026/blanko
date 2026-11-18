import type { Action, GameEvent } from './actions.ts';
import { cardOf, type CardId } from './cards.ts';
import { learn, playerMask } from './knowledge.ts';
import { at, replaceAt } from './list.ts';
import type { GameState } from './state.ts';
import { discardFaceUp, endTurn, handOf, withHand, type ActionResult } from './turn.ts';

type DrawnAction = Extract<
  Action,
  { type: 'keep' | 'discardDrawn' | 'peekOwn' | 'peekOpponent' | 'blindSwap' }
>;

function cardAt(state: GameState, player: number, slot: number): CardId {
  const card = at(handOf(state, player), slot);
  if (card === null) {
    throw new Error(`Platz ${String(slot)} von Spieler ${String(player)} ist leer`);
  }
  return card;
}

/** Gezogene Karte behalten; die ersetzte Karte geht offen auf den Ablagestapel. */
function keep(state: GameState, drawn: CardId, slot: number): ActionResult {
  const player = state.current;
  const replaced = cardAt(state, player, slot);
  const next = discardFaceUp(
    withHand(state, player, replaceAt(handOf(state, player), slot, drawn)),
    replaced,
  );
  return endTurn(next, [{ type: 'kept', player, slot, discarded: cardOf(replaced) }]);
}

/** Wirkung der Sonderkarte; die gezogene Karte liegt dann schon auf dem Ablagestapel. */
function applySpecial(
  state: GameState,
  action: DrawnAction,
): { state: GameState; event: GameEvent | null } {
  const player = state.current;
  switch (action.type) {
    case 'keep':
    case 'discardDrawn':
      return { state, event: null };
    case 'peekOwn': {
      const card = cardAt(state, player, action.slot);
      return {
        state: { ...state, knowledge: learn(state.knowledge, card, playerMask(player)) },
        event: { type: 'peekedOwn', player, slot: action.slot },
      };
    }
    case 'peekOpponent': {
      const card = cardAt(state, action.target, action.targetSlot);
      return {
        state: { ...state, knowledge: learn(state.knowledge, card, playerMask(player)) },
        event: {
          type: 'peekedOpponent',
          player,
          target: action.target,
          targetSlot: action.targetSlot,
        },
      };
    }
    case 'blindSwap': {
      // Das Wissen hängt an den Karten-IDs und wandert deshalb ohne weiteres Zutun mit.
      const own = cardAt(state, player, action.slot);
      const theirs = cardAt(state, action.target, action.targetSlot);
      const afterOwn = withHand(
        state,
        player,
        replaceAt(handOf(state, player), action.slot, theirs),
      );
      const swapped = withHand(
        afterOwn,
        action.target,
        replaceAt(handOf(afterOwn, action.target), action.targetSlot, own),
      );
      return {
        state: swapped,
        event: {
          type: 'swapped',
          player,
          slot: action.slot,
          target: action.target,
          targetSlot: action.targetSlot,
        },
      };
    }
  }
}

export function resolveDrawn(state: GameState, drawn: CardId, action: DrawnAction): ActionResult {
  if (action.type === 'keep') {
    return keep(state, drawn, action.slot);
  }
  const discarded = discardFaceUp(state, drawn);
  const { state: next, event } = applySpecial(discarded, action);
  const events: GameEvent[] = [{ type: 'discarded', player: state.current, card: cardOf(drawn) }];
  if (event !== null) {
    events.push(event);
  }
  return endTurn(next, events);
}
