import { actionKey, type Action } from './actions.ts';
import { resolveDrawn } from './drawn-moves.ts';
import { resolveSpecial } from './special-moves.ts';
import { legalActions } from './legal.ts';
import type { Rng } from './rng.ts';
import type { GameState } from './state.ts';
import type { ActionResult } from './turn.ts';
import { draw, knock, matchDiscard } from './turn-start-moves.ts';

function assertLegal(state: GameState, action: Action): void {
  const key = actionKey(action);
  if (!legalActions(state).some((legal) => actionKey(legal) === key)) {
    throw new Error(`Nicht erlaubte Aktion: ${key}`);
  }
}

/**
 * Reducer der Engine: liefert einen neuen Zustand und die dabei entstandenen Ereignisse.
 * Der Eingabezustand bleibt unverändert; Zufall kommt nur aus `rng`.
 */
export function applyAction(state: GameState, action: Action, rng: Rng): ActionResult {
  assertLegal(state, action);
  switch (action.type) {
    case 'draw':
      return draw(state, rng);
    case 'knock':
      return knock(state);
    case 'matchDiscard':
      return matchDiscard(state, action.slot, rng);
    case 'keep':
    case 'discardDrawn':
      if (state.phase.kind !== 'drawn') {
        throw new Error('Keine gezogene Karte vorhanden');
      }
      return resolveDrawn(state, state.phase.card, action);
    case 'peekOwn':
    case 'peekOpponent':
    case 'blindSwap':
    case 'skipSpecial':
      return resolveSpecial(state, action);
  }
}
