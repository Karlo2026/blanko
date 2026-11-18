import { describe, expect, it } from 'vitest';
import { applyAction } from './apply.ts';
import { DECK_SIZE } from './cards.ts';
import { determinize } from './determinize.ts';
import { knows } from './knowledge.ts';
import { legalActions } from './legal.ts';
import { at } from './list.ts';
import { createRng } from './rng.ts';
import { startRound } from './setup.ts';
import type { GameState } from './state.ts';
import { getPlayerView } from './view.ts';

/** Ein Zustand mitten in der Runde, erreicht mit zufälligen Zügen. */
function midRound(seed: number, steps: number): GameState {
  const rng = createRng(seed);
  let state = startRound({ playerCount: 4, dealer: 0 }, rng);
  for (let i = 0; i < steps && state.phase.kind !== 'roundOver'; i++) {
    const legal = legalActions(state).filter((a) => a.type !== 'knock');
    state = applyAction(state, at(legal, rng.nextInt(legal.length)), rng).state;
  }
  return state;
}

describe('determinize', () => {
  it('erzeugt einen Zustand, den der Spieler nicht vom echten unterscheiden kann', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const real = midRound(seed, seed % 20);
      const view = getPlayerView(real, real.current);
      const guess = determinize(view, createRng(seed + 100), 1, 0);
      expect(getPlayerView(guess, real.current)).toEqual(view);
    }
  });

  it('verwendet jede Karte genau einmal', () => {
    const view = getPlayerView(midRound(3, 15), 2);
    const guess = determinize(view, createRng(1), 1, 0);
    const drawn = guess.phase.kind === 'drawn' ? [guess.phase.card] : [];
    const all = [
      ...guess.hands.flat().filter((c) => c !== null),
      ...guess.drawPile,
      ...guess.discardPile,
      ...drawn,
    ];
    expect(new Set(all).size).toBe(DECK_SIZE);
    expect(all).toHaveLength(DECK_SIZE);
  });

  it('verteilt unbekannte Karten zufällig', () => {
    const view = getPlayerView(midRound(4, 0), 1);
    const first = determinize(view, createRng(1), 1, 0);
    const second = determinize(view, createRng(2), 1, 0);
    expect(first.hands).not.toEqual(second.hands);
  });

  it('lässt Gegner ihre eigenen Karten mit der angegebenen Wahrscheinlichkeit kennen', () => {
    const view = getPlayerView(midRound(5, 0), 1);
    const knownShare = (share: number): number => {
      const guess = determinize(view, createRng(1), share, 0);
      const own = (guess.hands[2] ?? []).filter((c) => c !== null);
      return own.filter((card) => knows(guess.knowledge, card, 2)).length / own.length;
    };
    expect(knownShare(1)).toBe(1);
    expect(knownShare(0)).toBe(0);
  });

  it('liefert Zustände, aus denen sich regelkonform weiterspielen lässt', () => {
    const real = midRound(6, 7);
    const guess = determinize(getPlayerView(real, real.current), createRng(1), 1, 0);
    expect(legalActions(guess)).toEqual(legalActions(real));
  });
});
