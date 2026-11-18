import { describe, expect, it } from 'vitest';
import { applyAction } from './apply.ts';
import { DECK_SIZE } from './cards.ts';
import { legalActions } from './legal.ts';
import { at } from './list.ts';
import { createRng } from './rng.ts';
import { scoreRound } from './scoring.ts';
import { startRound } from './setup.ts';
import type { GameState } from './state.ts';

const MAX_ACTIONS = 10_000;

function allCards(state: GameState): number[] {
  const drawn = state.phase.kind === 'drawn' ? [state.phase.card] : [];
  const inHands = state.hands.flat().filter((c): c is number => c !== null);
  return [...inHands, ...state.drawPile, ...state.discardPile, ...drawn];
}

function expectNoCardLostOrDuplicated(state: GameState): void {
  const cards = allCards(state);
  expect(cards).toHaveLength(DECK_SIZE);
  expect(new Set(cards).size).toBe(DECK_SIZE);
}

/**
 * Spielt eine Runde mit zufälligen erlaubten Zügen. Geklopft wird nur mit `knockChance`,
 * damit auch lange Runden mit Neumischen vorkommen.
 */
function playRandomRound(playerCount: number, seed: number, knockChance = 0.2): GameState {
  const rng = createRng(seed);
  let state = startRound({ playerCount, dealer: rng.nextInt(playerCount) }, rng);
  for (let step = 0; state.phase.kind !== 'roundOver'; step++) {
    if (step >= MAX_ACTIONS) throw new Error(`Runde endet nicht (Seed ${String(seed)})`);
    const legal = legalActions(state);
    expect(legal.length).toBeGreaterThan(0);
    const knock = legal.find((a) => a.type === 'knock');
    const others = legal.filter((a) => a.type !== 'knock');
    const action =
      knock !== undefined && (others.length === 0 || rng.next() < knockChance)
        ? knock
        : at(others, rng.nextInt(others.length));
    const result = applyAction(state, action, rng);
    reshuffles += result.events.filter((e) => e.type === 'reshuffled').length;
    state = result.state;
    expectNoCardLostOrDuplicated(state);
  }
  return state;
}

let reshuffles = 0;

describe('Partien mit Zufallszügen', () => {
  it.each([2, 3, 4, 5, 6])(
    'laufen mit %i Spielern über viele Seeds fehlerfrei durch',
    (playerCount) => {
      for (let seed = 1; seed <= 200; seed++) {
        const final = playRandomRound(playerCount, seed);
        const score = scoreRound(final, createRng(seed));
        expect([...score.ranking].sort()).toEqual(Array.from({ length: playerCount }, (_, i) => i));
        expect(score.placementPoints.reduce((a, b) => a + b, 0)).toBe(0);
      }
    },
  );

  it('überstehen auch lange Runden mit mehrfachem Neumischen', () => {
    reshuffles = 0;
    for (let seed = 1; seed <= 50; seed++) {
      playRandomRound(2 + (seed % 5), seed, 0.002);
    }
    expect(reshuffles).toBeGreaterThan(50);
  });

  it('sind bei gleichem Seed identisch', () => {
    expect(playRandomRound(4, 77)).toEqual(playRandomRound(4, 77));
  });
});
