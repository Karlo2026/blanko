import type { Action } from './actions.ts';
import { at } from './list.ts';
import { canTakeFromDrawPile } from './piles.ts';
import { RULES } from './rules.ts';
import type { GameState, Hand, PlayerId, SpecialRank } from './state.ts';

function occupiedSlots(hand: Hand): number[] {
  return hand.flatMap((card, slot) => (card === null ? [] : [slot]));
}

function opponentSlots(
  state: GameState,
  includeKnocker: boolean,
): { target: PlayerId; targetSlot: number }[] {
  return state.hands.flatMap((hand, target) => {
    const excluded = target === state.current || (!includeKnocker && target === state.knocker);
    return excluded ? [] : occupiedSlots(hand).map((targetSlot) => ({ target, targetSlot }));
  });
}

function mayKnock(state: GameState): boolean {
  if (state.knocker !== null) {
    return false;
  }
  return RULES.knockFromFirstTurn || state.turnCount >= state.playerCount;
}

function turnStartActions(state: GameState): Action[] {
  const own = occupiedSlots(at(state.hands, state.current));
  const actions: Action[] = [];
  if (canTakeFromDrawPile(state)) {
    actions.push({ type: 'draw' });
  }
  if (mayKnock(state)) {
    actions.push({ type: 'knock' });
  }
  if (state.matchableRank !== null) {
    actions.push(...own.map((slot): Action => ({ type: 'matchDiscard', slot })));
  }
  return actions;
}

/** Wirkung der gerade abgelegten 8, 9 oder 10; verzichten ist immer erlaubt. */
function specialActions(state: GameState, rank: SpecialRank): Action[] {
  const own = occupiedSlots(at(state.hands, state.current));
  const skip: Action = { type: 'skipSpecial' };
  switch (rank) {
    case 8:
      return [skip, ...own.map((slot): Action => ({ type: 'peekOwn', slot }))];
    case 9:
      return [
        skip,
        ...opponentSlots(state, RULES.ninePeekAtKnocker).map((t): Action => ({
          type: 'peekOpponent',
          ...t,
        })),
      ];
    case 10:
      return [
        skip,
        ...own.flatMap((slot) =>
          opponentSlots(state, RULES.tenSwapWithKnocker).map((t): Action => ({
            type: 'blindSwap',
            slot,
            ...t,
          })),
        ),
      ];
  }
}

function drawnActions(state: GameState): Action[] {
  const own = occupiedSlots(at(state.hands, state.current));
  return [{ type: 'discardDrawn' }, ...own.map((slot): Action => ({ type: 'keep', slot }))];
}

/** Alle erlaubten Aktionen des aktuellen Spielers. Die oberste Ablagekarte zu nehmen ist nie erlaubt. */
export function legalActions(state: GameState): Action[] {
  switch (state.phase.kind) {
    case 'turnStart':
      return turnStartActions(state);
    case 'drawn':
      return drawnActions(state);
    case 'special':
      return specialActions(state, state.phase.rank);
    case 'roundOver':
      return [];
  }
}
