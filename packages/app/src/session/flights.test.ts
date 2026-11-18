import { describe, expect, it } from 'vitest';
import { anchorKey, flightDuration, flightsFor, FLIGHT_MS } from './flights.ts';
import { cardFor, viewWith } from './test-views.ts';

const before = viewWith({ phase: 'drawn', drawnCard: cardFor(2) });
const after = viewWith({});

describe('flightsFor', () => {
  it('zeigt die eigene gezogene Karte offen, die eines Gegners verdeckt', () => {
    const own = flightsFor(
      [{ type: 'drew', player: 0 }],
      viewWith({}),
      viewWith({ phase: 'drawn', drawnCard: cardFor(5) }),
    );
    expect(own).toEqual([
      {
        from: { kind: 'drawPile' },
        to: { kind: 'drawn' },
        face: { kind: 'face', card: cardFor(5) },
        delayMs: 0,
      },
    ]);
    expect(flightsFor([{ type: 'drew', player: 1 }], after, after)[0]?.face).toEqual({
      kind: 'back',
    });
  });

  it('bewegt beim Behalten die gezogene Karte in die Hand und die alte auf die Ablage', () => {
    const plans = flightsFor(
      [{ type: 'kept', player: 0, slot: 2, discarded: cardFor(13) }],
      before,
      after,
    );
    expect(plans.map((p) => [anchorKey(p.from), anchorKey(p.to)])).toEqual([
      ['drawn', 'slot:0:2'],
      ['slot:0:2', 'discardPile'],
    ]);
    expect(plans[0]?.face).toEqual({ kind: 'face', card: cardFor(2) });
    expect(plans[1]?.face).toEqual({ kind: 'face', card: cardFor(13) });
  });

  it('kreuzt beim 10-Tausch zwei verdeckte Karten', () => {
    const plans = flightsFor(
      [{ type: 'swapped', player: 1, slot: 0, target: 2, targetSlot: 3 }],
      before,
      after,
    );
    expect(plans.map((p) => [anchorKey(p.from), anchorKey(p.to)])).toEqual([
      ['slot:1:0', 'slot:2:3'],
      ['slot:2:3', 'slot:1:0'],
    ]);
    expect(plans.every((p) => p.face.kind === 'back')).toBe(true);
  });

  it('spielt falsches Ablegen nacheinander ab: hin, zurück, Strafkarte', () => {
    const plans = flightsFor(
      [{ type: 'matchFailed', player: 1, slot: 0, card: cardFor(4), penaltySlot: 4 }],
      before,
      after,
    );
    expect(plans.map((p) => p.delayMs)).toEqual([0, FLIGHT_MS, 2 * FLIGHT_MS]);
    expect(anchorKey(plans[2]?.to ?? { kind: 'drawn' })).toBe('slot:1:4');
    expect(flightDuration(plans)).toBe(3 * FLIGHT_MS);
  });

  it('bewegt nichts beim Klopfen oder Anschauen', () => {
    expect(
      flightsFor(
        [
          { type: 'knocked', player: 1 },
          { type: 'peekedOwn', player: 1, slot: 0 },
        ],
        before,
        after,
      ),
    ).toEqual([]);
    expect(flightDuration([])).toBe(0);
  });
});
