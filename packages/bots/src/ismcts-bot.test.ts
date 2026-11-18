import { actionKey, createRng, type Action } from '@blanko/engine';
import { describe, expect, it } from 'vitest';
import { createIsmctsBot } from './ismcts-bot.ts';
import { BASE_PARAMS, cardFor, consistent, hidden, known, makeView } from './test-support.ts';

const bot = createIsmctsBot(
  { iterations: 60, timeBudgetMs: null, rollout: BASE_PARAMS, reading: 0 },
  0,
);
const opponentHidden = [hidden, hidden, hidden, hidden];
const keeps = (slots: number[]): Action[] => slots.map((slot) => ({ type: 'keep', slot }));

describe('IsmctsBot', () => {
  it('wählt immer eine erlaubte Aktion und ist bei gleichem Seed reproduzierbar', () => {
    const view = consistent(
      makeView({ hands: [[hidden, hidden, known(9), known(6)], opponentHidden] }),
    );
    const legal: Action[] = [{ type: 'draw' }, { type: 'knock' }];
    const first = bot.chooseAction(view, legal, createRng(5));
    expect(legal.map(actionKey)).toContain(actionKey(first));
    expect(bot.chooseAction(view, legal, createRng(5))).toEqual(first);
  });

  it('klopft mit einer sicher sehr niedrigen Hand', () => {
    const view = consistent(
      makeView({
        hands: [[known(1), known(2), { kind: 'empty' }, { kind: 'empty' }], opponentHidden],
      }),
    );
    expect(bot.chooseAction(view, [{ type: 'draw' }, { type: 'knock' }], createRng(1))).toEqual({
      type: 'knock',
    });
  });

  it('klopft nicht mit einer hohen Hand', () => {
    const view = consistent(
      makeView({ hands: [[known(13), known(12), known(11), known(9)], opponentHidden] }),
    );
    expect(bot.chooseAction(view, [{ type: 'draw' }, { type: 'knock' }], createRng(1))).toEqual({
      type: 'draw',
    });
  });

  it('behält ein gezogenes Ass statt seines bekannten Königs', () => {
    const view = consistent(
      makeView({
        phase: 'drawn',
        drawnCard: cardFor(1),
        hands: [[known(4), known(13), known(3), known(2)], opponentHidden],
      }),
    );
    const legal: Action[] = [{ type: 'discardDrawn' }, ...keeps([0, 1, 2, 3])];
    expect(bot.chooseAction(view, legal, createRng(1))).toEqual({ type: 'keep', slot: 1 });
  });

  it('legt keine unbekannte Karte auf Verdacht ab, wenn sie kaum passen kann', () => {
    const view = consistent(
      makeView({
        hands: [[hidden, known(2), known(3), known(4)], opponentHidden],
        matchableRank: 7,
      }),
    );
    const legal: Action[] = [
      { type: 'draw' },
      { type: 'knock' },
      ...[0, 1, 2, 3].map((slot): Action => ({ type: 'matchDiscard', slot })),
    ];
    expect(bot.chooseAction(view, legal, createRng(1)).type).not.toBe('matchDiscard');
  });

  it('hält ein Zeitbudget ein', () => {
    const slow = createIsmctsBot(
      { iterations: 1_000_000, timeBudgetMs: 50, rollout: BASE_PARAMS, reading: 0 },
      0,
    );
    const view = consistent(
      makeView({ hands: [[hidden, hidden, known(9), known(6)], opponentHidden] }),
    );
    const started = Date.now();
    slow.chooseAction(view, [{ type: 'draw' }, { type: 'knock' }], createRng(1));
    expect(Date.now() - started).toBeLessThan(500);
  });
});
