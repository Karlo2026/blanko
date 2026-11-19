import type { Action, GameEvent } from './actions.ts';
import { cardOf, type CardId } from './cards.ts';
import { replaceAt } from './list.ts';
import type { GameState } from './state.ts';
import {
  cardAt,
  discardFaceUp,
  finishDiscard,
  handOf,
  withHand,
  type ActionResult,
} from './turn.ts';

type DrawnAction = Extract<Action, { type: 'keep' | 'discardDrawn' }>;

/** Gezogene Karte behalten; die ersetzte Karte geht offen auf den Ablagestapel. */
function keep(state: GameState, drawn: CardId, slot: number): ActionResult {
  const player = state.current;
  const replaced = cardAt(state, player, slot);
  const placed = withHand(state, player, replaceAt(handOf(state, player), slot, drawn));
  const next = discardFaceUp(
    { ...placed, keptOver: replaceAt(state.keptOver, drawn, replaced) },
    replaced,
  );
  const events: GameEvent[] = [{ type: 'kept', player, slot, discarded: cardOf(replaced) }];
  return finishDiscard(next, replaced, events);
}

export function resolveDrawn(state: GameState, drawn: CardId, action: DrawnAction): ActionResult {
  if (action.type === 'keep') {
    return keep(state, drawn, action.slot);
  }
  const events: GameEvent[] = [{ type: 'discarded', player: state.current, card: cardOf(drawn) }];
  return finishDiscard(discardFaceUp(state, drawn), drawn, events);
}
