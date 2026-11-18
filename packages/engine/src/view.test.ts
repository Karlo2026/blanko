import { describe, expect, it } from 'vitest';
import { createRng } from './rng.ts';
import { startRound } from './setup.ts';
import { play } from './test-support.ts';
import { getPlayerView } from './view.ts';

describe('getPlayerView', () => {
  const state = startRound({ playerCount: 3, dealer: 2 }, createRng(11));

  it('zeigt nur bekannte Karten und verrät bei verdeckten nichts', () => {
    const view = getPlayerView(state, 0);
    expect(view.hands[0]?.map((slot) => slot.kind)).toEqual(['hidden', 'hidden', 'known', 'known']);
    for (const hand of view.hands.slice(1)) {
      expect(hand).toEqual([
        { kind: 'hidden' },
        { kind: 'hidden' },
        { kind: 'hidden' },
        { kind: 'hidden' },
      ]);
    }
  });

  it('zeigt die gezogene Karte nur dem Ziehenden', () => {
    const drawn = play(state, [{ type: 'draw' }]).state;
    expect(getPlayerView(drawn, 0).drawnCard).not.toBeNull();
    expect(getPlayerView(drawn, 1).drawnCard).toBeNull();
    expect(getPlayerView(drawn, 0).canStillPeek).toBe(false);
    expect(getPlayerView(drawn, 1).canStillPeek).toBe(true);
  });

  it('zeigt Stapelgröße und den offenen Ablagestapel', () => {
    const view = getPlayerView(state, 1);
    expect(view.drawPileSize).toBe(state.drawPile.length);
    expect(view.discardPile.map((c) => c.id)).toEqual(state.discardPile);
  });
});
