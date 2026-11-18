import { applyAction, getPlayerView, legalActions, type GameState, type Rng } from '@blanko/engine';
import type { Bot } from './bot.ts';
import { freshMemory, recall, updateMemory, type Memory } from './memory.ts';

/** Ein Platz am Tisch: welcher Bot spielt und wie vergesslich er ist. */
export interface Seat {
  readonly bot: Bot;
  readonly forgetRate: number;
}

/**
 * Spielt eine Runde bis zum Ende oder bis `turnLimit` weitere Züge gespielt sind. Das Limit
 * schützt vor Runden, in denen kein Bot je klopft; abgebrochene Runden erkennt der Aufrufer an
 * `phase.kind !== 'roundOver'`. Jeder Bot bekommt nur seine Sicht, gefiltert durch sein
 * Gedächtnis. Gedächtnisse ohne Vergessen werden übersprungen, weil sie sich nie ändern.
 */
export function playRound(
  start: GameState,
  seats: readonly Seat[],
  rng: Rng,
  turnLimit = Infinity,
): GameState {
  let state = start;
  let memories: readonly Memory[] = seats.map(() => freshMemory);
  const lastTurn = start.turnCount + turnLimit;
  while (state.phase.kind !== 'roundOver' && state.turnCount < lastTurn) {
    const seat = seats[state.current];
    const memory = memories[state.current];
    if (seat === undefined || memory === undefined) {
      throw new Error(`Kein Bot auf Platz ${String(state.current)}`);
    }
    const view = recall(getPlayerView(state, state.current), memory);
    const action = seat.bot.chooseAction(view, legalActions(state), rng);
    const result = applyAction(state, action, rng);
    state = result.state;
    const after = state;
    memories = memories.map((m, player) => {
      const forgetRate = seats[player]?.forgetRate ?? 0;
      return forgetRate === 0
        ? m
        : updateMemory(m, result.events, getPlayerView(after, player), forgetRate, rng);
    });
  }
  return state;
}
