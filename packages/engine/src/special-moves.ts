import type { Action, GameEvent } from './actions.ts';
import { learn, playerMask } from './knowledge.ts';
import { replaceAt } from './list.ts';
import type { GameState } from './state.ts';
import { cardAt, endTurn, handOf, withHand, type ActionResult } from './turn.ts';

type SpecialAction = Extract<
  Action,
  { type: 'peekOwn' | 'peekOpponent' | 'blindSwap' | 'skipSpecial' }
>;

/** Wirkung der abgelegten 8, 9 oder 10 – oder Verzicht darauf; danach endet der Zug. */
export function resolveSpecial(state: GameState, action: SpecialAction): ActionResult {
  const player = state.current;
  switch (action.type) {
    case 'skipSpecial':
      return endTurn(state, []);
    case 'peekOwn': {
      const card = cardAt(state, player, action.slot);
      const event: GameEvent = { type: 'peekedOwn', player, slot: action.slot };
      return endTurn({ ...state, knowledge: learn(state.knowledge, card, playerMask(player)) }, [
        event,
      ]);
    }
    case 'peekOpponent': {
      const card = cardAt(state, action.target, action.targetSlot);
      const event: GameEvent = {
        type: 'peekedOpponent',
        player,
        target: action.target,
        targetSlot: action.targetSlot,
      };
      return endTurn({ ...state, knowledge: learn(state.knowledge, card, playerMask(player)) }, [
        event,
      ]);
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
      const event: GameEvent = {
        type: 'swapped',
        player,
        slot: action.slot,
        target: action.target,
        targetSlot: action.targetSlot,
      };
      return endTurn(swapped, [event]);
    }
  }
}
