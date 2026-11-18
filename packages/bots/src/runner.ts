import { applyAction, getPlayerView, legalActions, type GameState, type Rng } from '@blanko/engine';
import type { Bot } from './bot.ts';
import { freshMemory, recall, updateMemory, type Memory } from './memory.ts';

/** Ein Platz am Tisch: welcher Bot spielt und wie vergesslich er ist. */
export interface Seat {
  readonly bot: Bot;
  readonly forgetRate: number;
}

/**
 * Spielt eine Runde bis zum Ende. Jeder Bot bekommt nur seine Sicht, gefiltert durch sein
 * Gedächtnis. Gedächtnisse ohne Vergessen werden übersprungen, weil sie sich nie ändern.
 */
export function playRound(start: GameState, seats: readonly Seat[], rng: Rng): GameState {
  let state = start;
  let memories: readonly Memory[] = seats.map(() => freshMemory);
  while (state.phase.kind !== 'roundOver') {
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
